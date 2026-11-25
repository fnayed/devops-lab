# DevOps — лабораторні роботи

[![CI](https://github.com/fnayed/devops-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/fnayed/devops-lab/actions/workflows/ci.yml)

Навчальний проєкт «Список задач», на якому послідовно виконуються всі лабораторні роботи з дисципліни «Технології DevOps».

## Лабораторні роботи

| №  | Тема                                | Код на момент здачі | Звіт                         |
|----|-------------------------------------|---------------------|------------------------------|
| 1  | Віртуалізація та контейнеризація    | [тег `lab1`](https://github.com/fnayed/devops-lab/tree/lab1) | [docs/lab1.md](docs/lab1.md) |
| 2  | Continuous Integration              | [тег `lab2`](https://github.com/fnayed/devops-lab/tree/lab2) | [docs/lab2.md](docs/lab2.md) |
| 3  | Розгортання в Kubernetes            | [тег `lab3`](https://github.com/fnayed/devops-lab/tree/lab3) | [docs/lab3.md](docs/lab3.md) |
| 4  | Пакування в Helm-чарт               | [тег `lab4`](https://github.com/fnayed/devops-lab/tree/lab4) | [docs/lab4.md](docs/lab4.md) |

> Кожна лабораторна виконується в окремій гілці (`lab2`, `lab3`, …) і вливається в `main` через Pull Request.
> Після здачі на коміт ставиться тег (`lab1`, `lab2`, …) — за ним завжди можна переглянути проєкт саме в тому стані, в якому його здавали.

## Архітектура

| Сервіс     | Технологія                | Порт  | Призначення                         |
|------------|---------------------------|-------|-------------------------------------|
| `frontend` | nginx                     | 8080  | Веб-сторінка, проксує `/api` на бекенд |
| `backend`  | Python 3.12 + FastAPI     | 8000  | REST API для роботи із задачами     |
| `db`       | PostgreSQL 16             | —     | База даних                          |

```
Браузер → frontend (nginx :8080) → backend (FastAPI :8000) → db (PostgreSQL)
```

## Структура проєкту

```
devops-lab/
├── .github/workflows/      # CI-пайплайн (GitHub Actions)
├── docker-compose.yml      # піднімає весь проєкт
├── docs/                   # звіти з лабораторних робіт
├── chart/devops-lab/       # Helm-чарт застосунку
├── k8s/                    # маніфести Kubernetes
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/                # код API
│   └── tests/              # тести (pytest)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── static/             # HTML + JS
```

## Запуск

Потрібен встановлений Docker (Docker Desktop).

```bash
docker compose up --build
```

Після запуску:
- застосунок: http://localhost:8080
- документація API (Swagger): http://localhost:8000/docs

Зупинка (`-v` — також видалити дані бази):

```bash
docker compose down
```

## Розгортання в Kubernetes (minikube)

Маніфести — у каталозі [`k8s/`](k8s), по одному файлу на об'єкт, усе в namespace `devops-lab`.

1. Запустити кластер і увімкнути доповнення:
   ```bash
   minikube start --driver=docker
   minikube addons enable ingress
   minikube addons enable metrics-server
   ```
2. Розгорнути застосунок однією командою:
   ```bash
   kubectl apply -f k8s/
   kubectl -n devops-lab get pods
   ```
3. Відкрити доступ із хоста (Windows/macOS з драйвером docker) — в окремому вікні, від адміністратора:
   ```bash
   minikube tunnel
   ```
   Застосунок: http://127.0.0.1

Образи: `ghcr.io/fnayed/devops-lab-backend` і `ghcr.io/fnayed/devops-lab-frontend`, версії `1.0.0` і `1.1.0`.

### Параметри ConfigMap `app-config`

| Ключ            | Значення     | Хто використовує | Призначення |
|-----------------|--------------|------------------|-------------|
| `APP_ENV`       | `kubernetes` | backend          | назва середовища (видно в `/api/info`) |
| `LOG_LEVEL`     | `info`       | backend          | рівень логування |
| `POSTGRES_DB`   | `tasks`      | postgres         | назва бази даних |
| `POSTGRES_USER` | `app`        | postgres         | користувач бази даних |

### Параметри Secret `app-secret`

| Ключ                | Хто використовує | Призначення |
|---------------------|------------------|-------------|
| `POSTGRES_PASSWORD` | postgres         | пароль користувача БД |
| `DATABASE_URL`      | backend          | рядок підключення до БД (містить пароль) |

Значення в `k8s/02-secret.yaml` — навчальні, не паролі від реальних систем.

## Розгортання Helm-чартом

Чарт — у каталозі [`chart/devops-lab/`](chart/devops-lab); описує той самий застосунок, що й `k8s/`, але параметризований
і з іменами об'єктів, побудованими з імені релізу (`<реліз>-devops-lab-backend` тощо), тож його можна встановити кілька разів в один кластер.
Потрібен **Helm 3** (перевірено на v3.16.4).

### Встановлення

Середовище розробки (1 репліка, без Ingress, версія 1.1.0):

```bash
helm upgrade --install app chart/devops-lab -n lab4 --create-namespace \
  -f chart/devops-lab/values-dev.yaml --set database.password=<пароль>
kubectl -n lab4 port-forward svc/app-devops-lab-frontend 8080:80   # http://localhost:8080
```

Продакшн (3 + 2 репліки, більші ресурси, перевірена версія 1.0.0, Ingress):

```bash
helm upgrade --install app chart/devops-lab -n prod --create-namespace \
  -f chart/devops-lab/values-prod.yaml --set database.password=<пароль>
minikube tunnel   # від адміністратора; застосунок — http://127.0.0.1
```

У `values-prod.yaml` пароля немає: без `--set database.password=...` встановлення зупиняється з помилкою.
У `values.yaml` є навчальний пароль `dev-only-password` лише для локального dev-кластера.
Пароль задається один раз: PostgreSQL застосовує його тільки під час першої ініціалізації тому, тому під час оновлень потрібно передавати той самий.

Перевірка та видалення:

```bash
helm test app -n lab4        # тест релізу: запит через фронтенд до /api/health
helm uninstall app -n lab4   # видаляє всі об'єкти релізу, включно з PVC
```

### `version` і `appVersion` у `Chart.yaml`

- **`version: 0.1.0`** — версія **самого чарта** (шаблонів і значень за замовчуванням). Змінюється при кожній зміні в `chart/`, навіть якщо застосунок той самий.
- **`appVersion: "1.1.0"`** — версія **застосунку**, яку чарт розгортає за замовчуванням. Збігається з тегом образів `ghcr.io/fnayed/devops-lab-*` і git-тегом `v1.1.0`; використовується, коли `*.image.tag` у values порожній.

Наприклад, виправлення в шаблоні NOTES.txt дає чарт `0.1.1` з тим самим `appVersion: 1.1.0`, а вихід версії застосунку `1.2.0` — новий `appVersion` і новий `version` чарта.

### Параметри `values.yaml`

| Параметр | За замовчуванням (dev) | prod (`values-prod.yaml`) | Опис |
|----------|------------------------|---------------------------|------|
| `nameOverride` / `fullnameOverride` | `""` | — | перевизначення імен об'єктів |
| `config.appEnv` | `development` | `production` | `APP_ENV` бекенду (видно в `/api/info`) |
| `config.logLevel` | `debug` | `warning` | `LOG_LEVEL` бекенду |
| `database.name` | `tasks` | — | назва бази даних |
| `database.user` | `app` | — | користувач бази даних |
| `database.password` | `dev-only-password` | `""` (обов'язково `--set`) | пароль БД → Secret |
| `backend.replicaCount` | `1` | `3` | кількість реплік бекенду |
| `backend.image.repository` | `ghcr.io/fnayed/devops-lab-backend` | — | репозиторій образу |
| `backend.image.tag` | `""` → `appVersion` (1.1.0) | `1.0.0` | тег образу |
| `backend.image.pullPolicy` | `IfNotPresent` | — | політика завантаження образу |
| `backend.service.type` / `.port` | `ClusterIP` / `8000` | — | сервіс бекенду |
| `backend.resources` | 50m/96Mi → 300m/192Mi | 100m/128Mi → 500m/256Mi | requests → limits |
| `frontend.replicaCount` | `1` | `2` | кількість реплік фронтенду |
| `frontend.image.repository` | `ghcr.io/fnayed/devops-lab-frontend` | — | репозиторій образу |
| `frontend.image.tag` | `""` → `appVersion` (1.1.0) | `1.0.0` | тег образу |
| `frontend.service.type` / `.port` | `ClusterIP` / `80` | — | сервіс фронтенду |
| `frontend.resources` | 25m/32Mi → 100m/64Mi | 50m/32Mi → 200m/128Mi | requests → limits |
| `postgres.image.repository` / `.tag` | `postgres` / `16-alpine` | — | образ бази даних |
| `postgres.service.port` | `5432` | — | порт сервісу бази |
| `postgres.resources` | 50m/128Mi → 300m/256Mi | — | requests → limits |
| `postgres.persistence.enabled` | `true` | — | PVC для даних (`false` → `emptyDir`) |
| `postgres.persistence.size` | `1Gi` | — | розмір тому |
| `postgres.persistence.storageClass` | `""` (клас за замовчуванням) | — | клас сховища |
| `ingress.enabled` | `false` | `true` | створювати Ingress |
| `ingress.className` | `nginx` | — | клас Ingress |
| `ingress.host` | `""` (будь-який) | — | хост Ingress |
| `hooks.dbCheck.enabled` | `true` | — | pre-upgrade хук перевірки БД |
| `hooks.dbCheck.image` | `postgres:16-alpine` | — | образ хука |
| `tests.image` | `busybox:1.36` | — | образ тесту `helm test` |

Пріоритет значень (від найнижчого до найвищого): `values.yaml` чарта → файли `-f` (у порядку переліку, наступний перекриває попередній) → `--set` / `--set-string` (найвищий).

## Тести

```bash
docker compose run --rm backend pytest -v
```

Фронтенд (потрібен Node.js 22): `cd frontend && npm ci && npm run lint && npm test`

## API

| Метод    | Шлях               | Опис                    |
|----------|--------------------|-------------------------|
| `GET`    | `/api/health`      | Перевірка стану         |
| `GET`    | `/api/tasks`       | Список задач            |
| `POST`   | `/api/tasks`       | Створити задачу         |
| `PATCH`  | `/api/tasks/{id}`  | Позначити виконаною     |
| `DELETE` | `/api/tasks/{id}`  | Видалити задачу         |
