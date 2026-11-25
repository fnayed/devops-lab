# Веб-сервер nginx віддає статичні файли і проксує /api на бекенд
FROM nginx:stable-alpine

# Оновлюємо системні пакети, щоб закрити відомі вразливості базового образу
RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY static/ /usr/share/nginx/html/

EXPOSE 80
