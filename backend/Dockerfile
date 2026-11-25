# Базовий образ з Python
FROM python:3.12-slim

# Робоча папка всередині контейнера
WORKDIR /app

# Спочатку ставимо залежності (цей шар кешується, поки requirements.txt не змінився)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо код застосунку та тести
COPY . .

# Версія застосунку передається під час збірки (у CI — з git-тегу, напр. 1.0.0)
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

EXPOSE 8000

# Запуск веб-сервера
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
