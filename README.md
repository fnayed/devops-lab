# DevOps — лабораторні роботи

[![CI](https://github.com/fnayed/devops-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/fnayed/devops-lab/actions/workflows/ci.yml)

Навчальний проєкт «Список задач», на якому послідовно виконуються всі лабораторні роботи з дисципліни «Технології DevOps».

## Лабораторні роботи

| №  | Тема                                | Код на момент здачі | Звіт                         |
|----|-------------------------------------|---------------------|------------------------------|
| 1  | Віртуалізація та контейнеризація    | [тег `lab1`](https://github.com/fnayed/devops-lab/tree/lab1) | [docs/lab1.md](docs/lab1.md) |
| 2  | Continuous Integration              | [тег `lab2`](https://github.com/fnayed/devops-lab/tree/lab2) | [docs/lab2.md](docs/lab2.md) |
| 3  | Розгортання в Kubernetes            | [тег `lab3`](https://github.com/fnayed/devops-lab/tree/lab3) | [docs/lab3.md](docs/lab3.md) |

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
