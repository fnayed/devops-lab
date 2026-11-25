# Лабораторна робота №1 — Віртуалізація та контейнеризація

Простий веб-застосунок «Список задач», який складається з трьох частин (контейнерів):

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
├── docker-compose.yml      # піднімає весь проєкт
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/                # код API
│   └── tests/              # unit/інтеграційні тести (pytest)
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

Зупинка:

```bash
docker compose down
```

Зупинка з видаленням даних бази:

```bash
docker compose down -v
```

## Тести

```bash
docker compose run --rm backend pytest -v
```

## API

| Метод    | Шлях               | Опис                    |
|----------|--------------------|-------------------------|
| `GET`    | `/api/health`      | Перевірка стану         |
| `GET`    | `/api/tasks`       | Список задач            |
| `POST`   | `/api/tasks`       | Створити задачу         |
| `PATCH`  | `/api/tasks/{id}`  | Позначити виконаною     |
| `DELETE` | `/api/tasks/{id}`  | Видалити задачу         |
