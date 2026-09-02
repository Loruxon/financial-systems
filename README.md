# financial-systems

Платформа для управления заявками на конвертацию/перевод валюты между организациями и администраторами: приём и подтверждение входящих платежей, расчёт себестоимости по настраиваемым схемам, исходящие платежи поставщикам, балансы счетов и организаций.

## Стек

- **Backend**: Django + Django REST Framework, PostgreSQL, S3-совместимое хранилище файлов (django-storages)
- **Frontend**: React + TypeScript, React Router, Tailwind CSS, shadcn/ui
- **Auth**: Logto (OIDC)
- **Инфраструктура**: Docker Compose, nginx

## Запуск в dev-режиме

1. Скопировать `.env.example` в `.env` и заполнить значения (пароль БД, Django secret key, доступы к S3-хранилищу).
2. `docker compose up -d`
3. Backend — `http://localhost:8000`, frontend — `http://localhost:5173`

Django-команды выполняются внутри контейнера:

```
docker compose exec django python manage.py <command>
```

## Запуск в production-режиме

Отдельный `docker-compose.prod.yml`: django собирается через gunicorn (`Dockerfile.prod`), react собирается статикой и отдаётся своим nginx (`Dockerfile.prod`), внешний nginx проксирует на них через TLS.

```
docker compose -f docker-compose.prod.yml up -d --build
```

Требуется тот же `.env`, что и для dev (пароль БД, Django secret key, S3), плюс реальные TLS-сертификаты, смонтированные в nginx-контейнер (путь задан в `docker-compose.prod.yml`).

### Автодеплой

`./deploy.sh` — идемпотентный скрипт для сервера: подтягивает код из GitHub (`git fetch` + `reset --hard origin/main`), пересобирает и поднимает `docker-compose.prod.yml`, создаёт БД `django_db`/`logto_db`, если их ещё нет, гоняет миграции Django, засеивает Logto только если его БД реально пустая (не задваивает сид при повторных запусках).

Первый раз на сервере:

```
git clone git@github.com:Loruxon/financial-systems.git
cd financial-systems
cp .env.example .env   # заполнить реальными значениями
./deploy.sh
```

Дальше для обновления — просто `./deploy.sh` снова.
