# Лабораторна робота №4 — Пакування застосунку в Helm-чарт

**Код на момент здачі:** тег [`lab4`](https://github.com/fnayed/devops-lab/tree/lab4)
**Pull Request із змінами лабораторної:** [PR «Лабораторна робота №4»](https://github.com/fnayed/devops-lab/pulls?q=is%3Apr+%D0%9B%D0%B0%D0%B1%D0%BE%D1%80%D0%B0%D1%82%D0%BE%D1%80%D0%BD%D0%B0+%E2%84%964)
**Чарт:** [`chart/devops-lab/`](../chart/devops-lab)
**Збережений вивід команд:** [`docs/lab4/`](lab4)

Інструменти: **Helm v3.16.4**, minikube v1.39.0 (драйвер docker), kubectl v1.37.2, доповнення ingress і metrics-server.

**Мета:** переписати маніфести з лабораторної №3 у власний Helm-чарт, параметризувати його для двох середовищ
і показати повний життєвий цикл релізу: встановлення, оновлення, історію, відкат і видалення.

## 1. Підготовка середовища

Вивід: [`01-env.txt`](lab4/01-env.txt).

1. Встановлено Helm 3: `helm version` → `v3.16.4`.
2. Кластер minikube запущено, `minikube status` показує, що всі компоненти працюють.
3. Маніфести лабораторної №3 розгорнуті, застосунок відповідає: `curl /api/info` → `{"version":"1.1.0","env":"kubernetes",...}`.
4. Розгортання лабораторної №3 видалено командою `kubectl delete -f k8s/`, щоб не було конфлікту імен. Namespace `devops-lab` більше не існує.

## 2. Структура чарта

```
chart/devops-lab/
├── Chart.yaml              # name, description, version, appVersion
├── .helmignore
├── values.yaml             # значення за замовчуванням = середовище розробки
├── values-dev.yaml         # dev
├── values-prod.yaml        # prod
└── templates/
    ├── _helpers.tpl        # іменовані шаблони: name, fullname, componentName, labels, selectorLabels, image, dbPassword
    ├── NOTES.txt           # підказка після встановлення
    ├── configmap.yaml          ← k8s/01-configmap.yaml
    ├── secret.yaml             ← k8s/02-secret.yaml
    ├── postgres-pvc.yaml       ← k8s/10-postgres-pvc.yaml       (if persistence.enabled)
    ├── postgres-deployment.yaml← k8s/11-postgres-deployment.yaml
    ├── postgres-service.yaml   ← k8s/12-postgres-service.yaml
    ├── backend-deployment.yaml ← k8s/20-backend-deployment.yaml
    ├── backend-service.yaml    ← k8s/21-backend-service.yaml
    ├── frontend-configmap.yaml   (нове — конфіг nginx, див. нижче)
    ├── frontend-deployment.yaml← k8s/30-frontend-deployment.yaml
    ├── frontend-service.yaml   ← k8s/31-frontend-service.yaml
    ├── ingress.yaml            ← k8s/40-ingress.yaml            (if ingress.enabled)
    ├── hook-db-check.yaml        (п.9 — pre-upgrade хук)
    └── tests/test-health.yaml    (п.9 — тест релізу)
```

**`version` і `appVersion`.** `version: 0.1.0` — це версія самого чарта, тобто шаблонів і значень. Вона змінюється при будь-якій зміні в `chart/`.
`appVersion: "1.1.0"` — це версія застосунку. Вона збігається з тегом образів `ghcr.io/fnayed/devops-lab-*:1.1.0` і git-тегом `v1.1.0`.
Якщо в values `*.image.tag` порожній, чарт підставляє саме `appVersion`. Пояснення також є в [README](../README.md#version-і-appversion-у-chartyaml).

## 3. Перенесення маніфестів у шаблони

- Кожен маніфест лабораторної №3 перенесено в окремий файл у `templates/`.
- Жорстко прописані значення замінено на `.Values`: образи й теги, кількість реплік, порти й типи сервісів, ресурси, параметри застосунку, розмір тому.
  У шаблонах немає жодного імені релізу, тега образу чи кількості реплік.
- **Імена будуються з імені релізу** через `include "devops-lab.fullname"`: виходить `<реліз>-devops-lab-<компонент>`, наприклад `app-devops-lab-backend`.
  Перевірено на практиці: другий реліз `second` встановився поруч з `app` в тому самому namespace без конфліктів ([`11-two-releases.txt`](lab4/11-two-releases.txt)).
- **Secret** не містить значень у шаблоні. `POSTGRES_PASSWORD` береться з `.Values.database.password`, а `DATABASE_URL` збирається з користувача, пароля, імені сервісу бази, порту й назви БД.
  Якщо пароль не задано, `required` зупиняє встановлення з повідомленням «Потрібно задати пароль бази».

Зміни відносно лабораторної №3:

| Що | Чому |
|----|------|
| Немає об'єкта `Namespace` | Helm встановлює реліз у namespace з `-n`, а `--create-namespace` створює його сам. Namespace у шаблоні заважав би встановленню в різні namespace і видаленню релізу. |
| Додано ConfigMap `<реліз>-devops-lab-frontend-nginx` | В образі фронтенду адресу бекенду жорстко прописано як `proxy_pass http://backend:8000`. У чарті сервіс бекенду має ім'я з префіксом релізу, тому конфіг nginx генерується шаблоном і монтується в `/etc/nginx/conf.d`. Образ при цьому не змінюється. |
| Анотації `checksum/config`, `checksum/secret`, `checksum/nginx` у подах | Якщо змінюються конфігурація або пароль, поди перезапускаються автоматично. |
| Мітки `app.kubernetes.io/*` + `helm.sh/chart` | Мітки рекомендовані Helm, задаються через `_helpers.tpl`. |

Порівняння об'єктів лабораторної №3 і чарта: [`05-compare.txt`](lab4/05-compare.txt). Повний згенерований маніфест: [`04-rendered-default.yaml`](lab4/04-rendered-default.yaml).

## 4. values.yaml

У values винесено:
- репозиторій, тег і `pullPolicy` образів;
- кількість реплік;
- тип і порт сервісів;
- `resources`;
- параметри застосунку (`config.appEnv`, `config.logLevel`, `database.*`);
- прапорці `ingress.enabled` і `postgres.persistence.enabled` для необов'язкових об'єктів.

Значення за замовчуванням відповідають середовищу розробки: по одній репліці, мінімальні ресурси, `development`/`debug`, без Ingress.
Повна таблиця параметрів є в [README](../README.md#параметри-valuesyaml).

## 5. Спільні шаблони та NOTES.txt

У `_helpers.tpl` описано такі іменовані шаблони:
- `devops-lab.fullname` — повне ім'я;
- `devops-lab.componentName` — ім'я компонента;
- `devops-lab.labels`, `devops-lab.componentLabels` і `devops-lab.selectorLabels` — набори міток;
- `devops-lab.image` — образ із fallback на `appVersion`;
- `devops-lab.dbPassword` — обов'язковий пароль.

Усі маніфести підключають їх через `include`. Селектори Deployment і Service використовують лише незмінні мітки (`name`, `instance`, `component`), тому оновлення не ламають селектори.

`NOTES.txt` виводить:
- версію застосунку та чарта;
- кількість реплік;
- команду для перегляду подів;
- спосіб відкрити застосунок: `kubectl port-forward` або адресу Ingress, залежно від `ingress.enabled`;
- команду `helm test`.

## 6. Два середовища ✅

| | dev (`values-dev.yaml`) | prod (`values-prod.yaml`) |
|---|---|---|
| Репліки backend / frontend | 1 / 1 | 3 / 2 |
| Ресурси backend (requests → limits) | 50m/96Mi → 300m/192Mi | 100m/128Mi → 500m/256Mi |
| Ресурси frontend | 25m/32Mi → 100m/64Mi | 50m/32Mi → 200m/128Mi |
| Тег образів | `1.1.0` (нова версія) | `1.0.0` (перевірена версія) |
| Ingress | вимкнено | увімкнено |
| `APP_ENV` / `LOG_LEVEL` | development / debug | production / warning |
| Пароль БД | `dev-only-password` з values.yaml (навчальний) | у файлі порожній, передається через `--set` |

**Різниця без встановлення в кластер.** Обидва середовища рендеряться через `helm template`, після чого виконується `diff`.
Вивід: [`02-env-diff.txt`](lab4/02-env-diff.txt). Видно відмінності в ConfigMap, кількості реплік, образах, ресурсах і новий об'єкт Ingress у prod.

**Пріоритет значень** перевірено на кількості реплік бекенду ([`02b-values-priority.txt`](lab4/02b-values-priority.txt)):

| Команда | `replicas` |
|---------|-----------|
| лише `values.yaml` | 1 |
| `-f values-prod.yaml` | 3 — файл `-f` перекриває `values.yaml` |
| `-f values-prod.yaml --set backend.replicaCount=5` | 5 — `--set` перекриває все |
| `-f values-prod.yaml -f values-dev.yaml` | 1 — з кількох `-f` перемагає останній |

Отже, пріоритет від нижчого до вищого такий: `values.yaml` чарта → файли `-f` (по черзі, наступний перекриває попередній) → `--set`.
Значення зливаються по ключах, а не замінюють увесь файл. Тому в `values-prod.yaml` достатньо вказати тільки те, що відрізняється.

## 7. Перевірка та встановлення ✅

| Пункт | Команда | Результат | Вивід |
|-------|---------|-----------|-------|
| a | `helm lint --strict` (default, dev, prod) | `0 chart(s) failed`; prod без пароля зупиняється з помилкою | [`03-lint.txt`](lab4/03-lint.txt) |
| b | `helm template` + порівняння з `k8s/` | той самий набір об'єктів (див. розділ 3) | [`04`](lab4/04-rendered-default.yaml), [`05`](lab4/05-compare.txt) |
| c | `helm install app chart/devops-lab -n lab4 --create-namespace -f values-dev.yaml --set database.password=*** --wait` | `STATUS: deployed`, `REVISION: 1`, виведено NOTES | [`06-install.txt`](lab4/06-install.txt) |
| d | `helm list`, `helm status --show-resources`, `helm get values` | реліз `deployed`, видно ресурси та передані значення | [`07-status.txt`](lab4/07-status.txt) |
| e | `kubectl get secret -l owner=helm` | стан релізу зберігається в Secret `sh.helm.release.v1.app.v1` | [`08-release-storage.txt`](lab4/08-release-storage.txt) |

Чарт встановлюється на чистому кластері **однією командою**: namespace створюється через `--create-namespace`, а `--wait` чекає готовності подів.
Застосунок працює. Через port-forward створено задачу з кирилицею й отримано список задач ([`09-app-check.txt`](lab4/09-app-check.txt)).

**Де Helm зберігає стан.** Для кожної ревізії в namespace релізу створюється Secret типу `helm.sh/release.v1` з іменем `sh.helm.release.v1.<реліз>.v<ревізія>`.
На Secret стоять мітки `owner=helm`, `name`, `status` і `version`.
Поле `data.release` — це закодований у base64 і стиснутий gzip JSON. Він містить ім'я, номер ревізії, статус, метадані чарта, values і повний відрендерений маніфест.
Розкодований вміст наведено у [`08-release-storage.txt`](lab4/08-release-storage.txt). Саме з цих Secret працюють `helm history` і `helm rollback`.
Через це пароль із `--set` також лежить у Secret релізу. Доступ до Secret у namespace потрібно обмежувати RBAC.

## 8. Життєвий цикл релізу ✅

Вивід: [`12-lifecycle.txt`](lab4/12-lifecycle.txt), [`13-uninstall.txt`](lab4/13-uninstall.txt).

| Ревізія | Дія | Що змінилося |
|---------|-----|--------------|
| 1 | `helm install ... -f values-dev.yaml` | dev: backend і frontend `1.1.0`, по 1 репліці, без Ingress |
| 2 | **8a** `helm upgrade ... --reuse-values --set backend.image.tag=1.0.0` | лише образ бекенду `1.1.0 → 1.0.0`: `diff` маніфестів ревізій 1 і 2 дає рівно один рядок |
| 3 | **8b** `helm upgrade ... -f values-prod.yaml --set database.password=***` | prod: backend 3 репліки, frontend 2, обидва `1.0.0`, більші ресурси, `production`/`warning`, з'явився Ingress |
| 4 | **8d** `helm rollback app 2` | повернення до стану ревізії 2: 1+1 репліка, Ingress видалено; ревізія 3 стала `superseded`, нова ревізія 4 має опис `Rollback to 2` |

**8c.** Зміни між ревізіями показано двома способами:
- `helm get values --revision N` дає значення кожної ревізії;
- `diff` виводів `helm get manifest --revision N` дає різницю маніфестів.

**8d.** Відкат не стирає історію, а створює **нову** ревізію з конфігурацією обраної старої. Після відкату `helm test` проходить успішно, `/api/info` показує версію `1.0.0`.

**8e.** Після `helm uninstall app -n lab4 --wait` у namespace не лишилося жодного об'єкта релізу: подів, сервісів, ConfigMap, Secret, PVC, Ingress і Job.
Лишився тільки `kube-root-ca.crt`, який Kubernetes сам створює в кожному namespace. `helm list --all` порожній.

### Помилка, знайдена під час виконання: зміна розміру PVC

У першій версії `values-prod.yaml` розмір тому бази становив `2Gi` (у dev `1Gi`). Перехід dev → prod через `helm upgrade` завершився помилкою ([`12a-failed-pvc-resize.txt`](lab4/12a-failed-pvc-resize.txt)):

```
Error: UPGRADE FAILED: cannot patch "app-devops-lab-postgres-data" with kind PersistentVolumeClaim:
... only dynamically provisioned pvc can be resized and the storageclass that provisions the pvc must support resize
```

Клас сховища `standard` у minikube не підтримує розширення томів. Ревізія 3 отримала статус `failed`, хоча частину об'єктів (Deployment, Ingress) Helm уже встиг змінити.
Команда `helm rollback app 1` повернула робочий стан. Висновки:
- поле `storage` в існуючому PVC не можна змінювати довільно, тому розмір тому залишено однаковим для обох середовищ;
- після невдалого upgrade кластер може лишитися в проміжному стані, і rollback до останньої успішної ревізії — штатний спосіб це виправити.

Після виправлення весь цикл виконано заново з чистого релізу.

### Нюанс із паролем бази

PostgreSQL застосовує `POSTGRES_PASSWORD` лише під час **першої** ініціалізації тому. Якщо під час upgrade передати інший пароль, Secret і `DATABASE_URL` оновляться, а пароль у базі залишиться старим, і бекенд не зможе підключитися.
Тому в демонстрації пароль один раз згенеровано випадково (`openssl rand -hex 12`), зберігався він лише в тимчасовому файлі поза репозиторієм і передавався через `--set` в усіх командах. У звітних файлах його замінено на `***`.

## 9. Завдання на вибір — варіант b: хук і тест релізу ✅

**Pre-upgrade хук** (`templates/hook-db-check.yaml`) — це Job з анотаціями:
- `helm.sh/hook: pre-upgrade`;
- `helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded`.

Перед кожним `helm upgrade` Job до 30 разів з паузою 2 с виконує `pg_isready` до сервісу бази цього релізу.
Якщо база недоступна, Job завершується з помилкою, і Helm скасовує оновлення до зміни будь-яких об'єктів.
Після успіху Job видаляється. Його запуск видно в подіях Kubernetes (`Created pod: app-devops-lab-db-check-...`, `Job completed`) у [`12-lifecycle.txt`](lab4/12-lifecycle.txt).
Хук вимикається значенням `hooks.dbCheck.enabled=false`.

**Тест релізу** (`templates/tests/test-health.yaml`) — це Pod з анотацією `helm.sh/hook: test`.
Він виконує запити `/api/health` і `/api/info` через **сервіс фронтенду**, тобто перевіряє весь ланцюжок nginx → бекенд → PostgreSQL.
Після успіху Pod видаляється (`hook-succeeded`), тому після `helm uninstall` не лишається «сміття».

```
$ helm test app -n lab4 --logs
TEST SUITE:     app-devops-lab-test-health
Phase:          Succeeded
POD LOGS: app-devops-lab-test-health
GET http://app-devops-lab-frontend:80/api/health
{"status":"ok"}
GET http://app-devops-lab-frontend:80/api/info
{"version":"1.1.0","env":"development","log_level":"DEBUG","pod":"app-devops-lab-backend-75d48d8444-8vsnn"}
```

Вивід: [`10-helm-test.txt`](lab4/10-helm-test.txt), а також перевірка після відкату в [`12-lifecycle.txt`](lab4/12-lifecycle.txt).

## 10. CI

У `.github/workflows/ci.yml` додано job **`helm`**:
- `helm lint --strict` для значень за замовчуванням, dev і prod;
- `helm template` для обох середовищ;
- перевірка, що рендеринг prod **без пароля завершується помилкою**, тобто захист від випадкового встановлення без пароля не зламано.

## Відповідність вимогам до здачі

| Вимога | Виконання |
|--------|-----------|
| Чарт описує той самий застосунок і дає той самий набір об'єктів | ConfigMap, Secret, PVC, 3 Deployment, 3 Service, Ingress — як у `k8s/`. Namespace створює Helm, конфіг nginx — додатковий ConfigMap (розділ 3) |
| Немає жорстко прописаних імені релізу, тега образу, кількості реплік | усі через `.Release.Name` / `.Values` / `.Chart.AppVersion` |
| Встановлюється на чистому кластері однією командою | `helm install app chart/devops-lab -n lab4 --create-namespace -f values-dev.yaml --set database.password=...` |
| Реальні паролі у файлах значень не зберігаються | `values-prod.yaml` — порожній пароль + `required`; у `values.yaml` лише навчальний `dev-only-password` для локального кластера |
