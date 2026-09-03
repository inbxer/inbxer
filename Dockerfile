# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build frontend assets (Vite/React) and Wayfinder route types
# ---------------------------------------------------------------------------
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: install PHP dependencies (composer, no dev, no scripts yet)
# ---------------------------------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --no-progress \
    --prefer-dist \
    --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --no-dev

# ---------------------------------------------------------------------------
# Stage 3: runtime image — PHP-FPM + nginx + supervisor, all in one container
# ---------------------------------------------------------------------------
FROM php:8.3-fpm-alpine AS app

LABEL org.opencontainers.image.title="Inbxer" \
      org.opencontainers.image.description="Inbxer support desk — single-image runtime (nginx + php-fpm + queue + scheduler + reverb)"

ARG PUID=1000
ARG PGID=1000

RUN apk add --no-cache \
        nginx \
        supervisor \
        bash \
        curl \
        git \
        icu-libs \
        libzip \
        libpng \
        libjpeg-turbo \
        freetype \
        oniguruma \
        libxml2 \
        mysql-client \
        redis \
        sqlite \
    && apk add --no-cache --virtual .build-deps \
        icu-dev \
        libzip-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        oniguruma-dev \
        libxml2-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mysqli \
        bcmath \
        intl \
        zip \
        gd \
        mbstring \
        exif \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/* /tmp/pear

# Non-root user matching the host UID/GID by default (overridable at build time)
RUN addgroup -g "${PGID}" -S inbxer \
    && adduser -u "${PUID}" -S inbxer -G inbxer

WORKDIR /var/www/html

COPY --from=vendor --chown=inbxer:inbxer /app /var/www/html
COPY --from=frontend --chown=inbxer:inbxer /app/public/build /var/www/html/public/build

COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-inbxer.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/supervisor/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p storage/framework/{cache,sessions,testing,views} storage/logs bootstrap/cache \
    && chown -R inbxer:inbxer storage bootstrap/cache /var/log/nginx /var/lib/nginx \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 8080 8081

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
