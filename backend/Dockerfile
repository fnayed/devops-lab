# Базовий образ з Python
FROM python:3.12-slim

# Робоча папка всередині контейнера
WORKDIR /app

# Спочатку ставимо залежності (цей шар кешується, поки requirements.txt не змінився)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо код застосунку та тести
COPY . .

EXPOSE 8000

# Запуск веб-сервера
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
