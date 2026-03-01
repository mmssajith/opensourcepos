FROM node:lts-slim AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY gulpfile.js ./
COPY public/ public/
COPY app/ app/
RUN rm -rf /app/app/Database/database.sql
RUN npx gulp default

FROM php:8.2-apache AS ospos
LABEL maintainer="jekkos"

RUN apt update && apt-get install -y libicu-dev libgd-dev
RUN a2enmod rewrite
RUN docker-php-ext-install mysqli bcmath intl gd
RUN echo "date.timezone = \"\${PHP_TIMEZONE}\"" > /usr/local/etc/php/conf.d/timezone.ini

WORKDIR /app
COPY . /app
RUN ln -s /app/*[^public] /var/www && rm -rf /var/www/html && ln -nsf /app/public /var/www/html
RUN chmod -R 770 /app/writable/uploads /app/writable/logs /app/writable/cache && chown -R www-data:www-data /app

FROM ospos AS ospos_test

COPY --from=composer /usr/bin/composer /usr/bin/composer

RUN apt-get install -y libzip-dev wget git
RUN wget https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /bin/wait-for-it.sh && chmod +x /bin/wait-for-it.sh
RUN docker-php-ext-install zip
RUN composer install -d/app
#RUN sed -i 's/backupGlobals="true"/backupGlobals="false"/g' /app/tests/phpunit.xml
WORKDIR /app/tests

CMD ["/app/vendor/phpunit/phpunit/phpunit", "/app/test/helpers"]

FROM ospos AS ospos_dev

COPY --from=composer /usr/bin/composer /usr/bin/composer

RUN apt-get install -y libzip-dev git default-mysql-client
RUN docker-php-ext-install zip
RUN composer install -d /app --no-interaction --no-progress

COPY --from=assets /app/public/resources /app/public/resources
COPY --from=assets /app/public/images/menubar /app/public/images/menubar
COPY --from=assets /app/app/Views/partial/header.php /app/app/Views/partial/header.php
COPY --from=assets /app/app/Database/database.sql /app/app/Database/database.sql

ARG USERID
ARG GROUPID

RUN echo "Adding user uid $USERID with gid $GROUPID"
RUN ( addgroup --gid $GROUPID ospos || true ) && ( adduser --uid $USERID --gid $GROUPID ospos )

RUN yes | pecl install xdebug \
    && echo "zend_extension=$(find /usr/local/lib/php/extensions/ -name xdebug.so)" > /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.mode=debug" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.remote_autostart=off" >> /usr/local/etc/php/conf.d/xdebug.ini

COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/migrate.sh /migrate.sh
RUN chmod +x /entrypoint.sh /migrate.sh

ENTRYPOINT ["/entrypoint.sh"]
