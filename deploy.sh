#!/usr/bin/env bash
# Разворачивает/обновляет прод на сервере. Идемпотентен — можно гонять
# повторно и для первого деплоя, и для обновления из GitHub.
#
# Требования на сервере перед первым запуском:
#   git clone git@github.com:Loruxon/financial-systems.git
#   cd financial-systems
#   cp .env.example .env && отредактировать реальные значения
#   ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.prod.yml"

if [ ! -d .git ]; then
  echo "Скрипт должен лежать внутри клона репозитория" >&2
  exit 1
fi

echo "==> Обновление кода из GitHub"
git fetch origin main
git reset --hard origin/main

if [ ! -f .env ]; then
  echo "ERROR: .env не найден. Скопируй .env.example в .env и заполни значения." >&2
  exit 1
fi

echo "==> Сборка и запуск контейнеров"
$COMPOSE up -d --build

echo "==> Ждём Postgres"
until $COMPOSE exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

echo "==> Создаём базы, если их ещё нет"
for db in django_db logto_db; do
  exists=$($COMPOSE exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'")
  if [ "$exists" != "1" ]; then
    echo "  создаю ${db}"
    $COMPOSE exec -T postgres psql -U postgres -c "CREATE DATABASE ${db};"
  fi
done

echo "==> Миграции Django"
$COMPOSE exec -T django python manage.py migrate --noinput

echo "==> Проверяем, нужно ли засеять Logto (только если БД реально пустая)"
table_count=$($COMPOSE exec -T postgres psql -U postgres -d logto_db -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "$table_count" = "0" ]; then
  echo "  logto_db пустая, засеиваю"
  $COMPOSE run --rm --entrypoint sh logto -c "npm run cli db seed -- --swe"
else
  echo "  logto_db уже засеяна, пропускаю"
fi

echo "==> Готово"
$COMPOSE ps
