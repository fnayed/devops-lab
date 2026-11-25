import os
import socket

# Версія вшивається в образ під час збірки (Dockerfile: ARG APP_VERSION)
APP_VERSION = os.getenv("APP_VERSION", "dev")

# Параметри, які в Kubernetes задаються через ConfigMap
APP_ENV = os.getenv("APP_ENV", "local")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()

# Ім'я хоста = ім'я пода в Kubernetes (видно, який под обробив запит)
HOSTNAME = socket.gethostname()
