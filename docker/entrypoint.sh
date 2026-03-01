#!/bin/sh
set -e

MYSQL="mysql --connect-timeout=10 --skip-ssl -h${MYSQL_HOST_NAME} -u${MYSQL_USERNAME} -p${MYSQL_PASSWORD} ${MYSQL_DB_NAME}"

# Generate .env from Docker environment variables if not present
if [ ! -f /app/.env ]; then
    echo "Generating .env from environment variables..."
    cat > /app/.env <<EOF
CI_ENVIRONMENT = ${CI_ENVIRONMENT:-production}

database.default.hostname = ${MYSQL_HOST_NAME}
database.default.database = ${MYSQL_DB_NAME}
database.default.username = ${MYSQL_USERNAME}
database.default.password = ${MYSQL_PASSWORD}
database.default.DBDriver = MySQLi
database.default.DBPrefix = ospos_

database.development.hostname = ${MYSQL_HOST_NAME}
database.development.database = ${MYSQL_DB_NAME}
database.development.username = ${MYSQL_USERNAME}
database.development.password = ${MYSQL_PASSWORD}
database.development.DBDriver = MySQLi
database.development.DBPrefix = ospos_

encryption.key = ${ENCRYPTION_KEY}

logger.threshold = 0
app.db_log_enabled = false
EOF
fi

echo "Regenerating autoloader..."
composer dump-autoload -d /app --quiet

echo "Checking if database schema is initialized..."
if ! $MYSQL -e "SELECT 1 FROM ospos_app_config LIMIT 1;" > /dev/null 2>&1; then
    echo "Loading base schema..."
    $MYSQL < /app/app/Database/tables.sql
    $MYSQL < /app/app/Database/constraints.sql
    echo "Base schema loaded."
else
    echo "Schema already initialized."
fi

echo "Running migrations..."
if php /app/spark migrate --all -n App; then
    echo "Migrations complete."
else
    echo "Warning: migrations failed, check logs. Continuing startup..."
fi

exec apache2-foreground
