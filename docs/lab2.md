# Лабораторна робота №2 — Continuous Integration

**Код на момент здачі:** тег [`lab2`](https://github.com/fnayed/devops-lab/tree/lab2)
**Pull Request із змінами лабораторної:** [PR «Лабораторна робота №2»](https://github.com/fnayed/devops-lab/pulls?q=is%3Apr+%D0%9B%D0%B0%D0%B1%D0%BE%D1%80%D0%B0%D1%82%D0%BE%D1%80%D0%BD%D0%B0+%E2%84%962)
**Пайплайн:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) · [запуски в Actions](https://github.com/fnayed/devops-lab/actions)

Інструменти: **GitHub Actions** (CI), **Ruff** і **ESLint** (статичний аналіз), **Trivy** (сканування образів), **GitHub Container Registry** (реєстр образів).

## Схема пайплайну

```
            ┌──────────────┐     ┌──────────────┐
PR / push → │   backend    │     │   frontend   │   ← паралельно, незалежно
            │ build → lint │     │ build → lint │
            │    → test    │     │    → test    │
            └──────┬───────┘     └──────┬───────┘
                   └─────────┬──────────┘
                             ▼  needs: [backend, frontend]
                 ┌───────────────────────────┐
                 │ images (backend/frontend) │   ← matrix
                 │ build → Trivy scan        │
                 │ → push у ghcr.io          │   ← лише для push, не для PR
                 └───────────────────────────┘
```

## 1. Підключення CI/CD

- Інструмент — GitHub Actions, конфігурація — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- Тригери: `pull_request` у `main` та `push` у `main`.
- Статус кожного завдання відображається в Pull Request у блоці перевірок (Checks).

## 2. Збірка та тестування сервісів

Для кожного сервісу — окреме завдання (`backend`, `frontend`). Вони виконуються паралельно і не залежать одне від одного: падіння одного не скасовує інше.

| Крок                 | backend (Python)                | frontend (JS)                          |
|----------------------|---------------------------------|----------------------------------------|
| Встановлення залежностей | `pip install -r requirements.txt` | `npm ci`                           |
| **Build**            | `python -m compileall app`      | `npm run build` (пакування `static/` → `dist/`) |
| **Lint**             | `ruff check`, `ruff format --check` | `npm run lint` (ESLint)            |
| **Test**             | `pytest` — 6 тестів API         | `npm test` (`node:test`) — 4 тести     |
| Кешування            | `actions/setup-python` `cache: pip` | `actions/setup-node` `cache: npm`  |

Для фронтенду в межах роботи додано: `package.json`, конфігурацію ESLint, модуль [`static/utils.js`](../frontend/static/utils.js) з функціями валідації та тести до нього ([`tests/utils.test.js`](../frontend/tests/utils.test.js)).

## 3. Статичний аналіз коду

- Python — **Ruff** ([`backend/ruff.toml`](../backend/ruff.toml)): правила `E`, `W`, `F`, `I`, `B` + перевірка форматування.
- JavaScript — **ESLint** ([`frontend/eslint.config.js`](../frontend/eslint.config.js)): набір `recommended`.
- Аналіз — окремий крок перед тестами. Крок **блокуючий**: будь-яке порушення завершує завдання з помилкою.
- Ruff запускається з `--output-format=github` — зауваження показуються прямо в PR, біля відповідного рядка коду (annotations).

## 4. Збірка контейнерних образів

- Завдання `images` має `needs: [backend, frontend]` — стартує лише після успішних збірки й тестів.
- Матриця `service: [backend, frontend]` — кожен образ збирається окремо з `Dockerfile` лабораторної №1.
- Образ збирається локально на раннері (`load: true`, `push: false`).
- **Trivy** сканує образ — блокуючий крок: критичні вразливості, що мають виправлення, зупиняють пайплайн.

> Під час виконання Trivy знайшов критичні вразливості (brotli, OpenSSL) у базовому образі `nginx:1.27-alpine`.
> Виправлено в [`frontend/Dockerfile`](../frontend/Dockerfile): базовий образ замінено на `nginx:stable-alpine` + `apk upgrade`.

## 5. Публікація образів у реєстрі

- Реєстр — GitHub Container Registry (`ghcr.io`).
- Автентифікація — через секрет CI `GITHUB_TOKEN`, облікових даних у репозиторії немає.
- Публікація — лише для `push` (умова `if: github.event_name == 'push'`), для Pull Request образи не публікуються.
- Теги (`docker/metadata-action`):
  - `sha-<повний SHA коміту>` — унікальний тег збірки;
  - `latest` — лише для основної гілки (`enable={{is_default_branch}}`).

Образи:
- `ghcr.io/fnayed/devops-lab-backend`
- `ghcr.io/fnayed/devops-lab-frontend`

Перевірка працездатності:

```bash
docker pull ghcr.io/fnayed/devops-lab-backend:latest
docker pull ghcr.io/fnayed/devops-lab-frontend:latest
docker run --rm -d -p 8000:8000 --name backend-check ghcr.io/fnayed/devops-lab-backend:latest
curl http://localhost:8000/api/health   # {"status":"ok"}
docker stop backend-check
```

## 6. Захист основної гілки

Branch Protection Rules для `main`:
- заборонено прямий push — зміни лише через Pull Request;
- обов'язкові перевірки (required status checks): `backend`, `frontend`, `images (backend)`, `images (frontend)`;
- правила діють і для адміністратора репозиторію.

Демонстрація заблокованого PR — окремий PR «Демонстрація: зламаний тест», у якому свідомо зламано тест: пайплайн падає, кнопка злиття заблокована.
