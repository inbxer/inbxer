#!/usr/bin/env bash
set -euo pipefail

cd /var/www/html

echo "[entrypoint] Waiting for database..."
if [ "${DB_CONNECTION:-mysql}" != "sqlite" ]; then
    for i in $(seq 1 30); do
        if php -r "
            try {
                new PDO(
                    'mysql:host=' . getenv('DB_HOST') . ';port=' . (getenv('DB_PORT') ?: 3306),
                    getenv('DB_USERNAME'),
                    getenv('DB_PASSWORD')
                );
                exit(0);
            } catch (Throwable \$e) { exit(1); }
        " 2>/dev/null; then
            echo "[entrypoint] Database is reachable."
            break
        fi
        echo "[entrypoint] Database not ready yet ($i/30)..."
        sleep 2
    done
fi

if [ ! -f storage/oauth-private.key ] && [ -z "${APP_KEY:-}" ]; then
    :
fi

if [ -z "${APP_KEY:-}" ] && ! grep -q "^APP_KEY=base64" .env 2>/dev/null; then
    echo "[entrypoint] Generating application key..."
    php artisan key:generate --force
fi

echo "[entrypoint] Running database migrations..."
php artisan migrate --force

echo "[entrypoint] Linking storage..."
php artisan storage:link || true

echo "[entrypoint] Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "[entrypoint] Ready. Starting: $*"
exec "$@"
