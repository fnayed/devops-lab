# Лабораторна робота №1 — Віртуалізація та контейнеризація

**Код на момент здачі:** тег [`lab1`](https://github.com/fnayed/devops-lab/tree/lab1)

## Завдання

1. Обрати проєкт: вебзастосунок, що взаємодіє з базою даних, містить тести та складається з кількох частин.
2. Створити `Dockerfile` для кожної частини проєкту.
3. Створити `docker-compose.yml`, який піднімає весь проєкт з усіма частинами (у т.ч. базою даних).
4. Залити проєкт на GitHub.

## Виконання

### 1. Проєкт

Вебзастосунок «Список задач» із трьох сервісів:

| Сервіс     | Технологія            | Призначення                                  |
|------------|-----------------------|----------------------------------------------|
| `frontend` | nginx                 | віддає сторінку, проксує `/api` на бекенд    |
| `backend`  | Python 3.12 + FastAPI | REST API (створення, перегляд, видалення задач) |
| `db`       | PostgreSQL 16         | зберігання задач                             |

Тести бекенду (pytest) — `backend/tests/test_api.py`, 6 тестів.

### 2. Dockerfile

- [`backend/Dockerfile`](../backend/Dockerfile) — образ `python:3.12-slim`, встановлення залежностей з `requirements.txt`, запуск `uvicorn`.
  Залежності копіюються окремим шаром до коду, щоб Docker кешував їх між збірками.
- [`frontend/Dockerfile`](../frontend/Dockerfile) — образ `nginx:1.27-alpine` з конфігурацією [`nginx.conf`](../frontend/nginx.conf) та статичними файлами.

### 3. docker-compose

[`docker-compose.yml`](../docker-compose.yml) описує три сервіси:

- `db` — PostgreSQL з `healthcheck` (`pg_isready`) і томом `db-data` для збереження даних;
- `backend` — збирається з `./backend`, отримує адресу БД через змінну `DATABASE_URL`, стартує лише після того, як БД стала healthy (`depends_on: condition: service_healthy`);
- `frontend` — збирається з `./frontend`, публікує порт `8080`.

Сервіси знаходять один одного за іменем (`db`, `backend`) у спільній мережі, яку створює compose.

### 4. GitHub

Репозиторій: https://github.com/fnayed/devops-lab

## Демонстрація

```bash
docker compose up --build -d
docker compose ps
```

Очікуваний результат — три контейнери у стані `Up`, `db` — `healthy`:

```
NAME                    SERVICE    STATUS
devops-lab-backend-1    backend    Up
devops-lab-db-1         db         Up (healthy)
devops-lab-frontend-1   frontend   Up
```

- http://localhost:8080 — застосунок
- http://localhost:8000/docs — Swagger-документація API

Тести:

```bash
docker compose run --rm backend pytest -v
```

```
========================= 6 passed in 0.43s =========================
```
