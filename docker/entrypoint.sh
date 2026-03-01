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
    echo "Generated .env:"
    cat /app/.env
fi

echo "--- Environment check ---"
echo "MYSQL_HOST_NAME=${MYSQL_HOST_NAME}"
echo "MYSQL_DB_NAME=${MYSQL_DB_NAME}"
echo "MYSQL_USERNAME=${MYSQL_USERNAME}"
echo "CI_ENVIRONMENT=${CI_ENVIRONMENT}"
echo "ENCRYPTION_KEY set: $([ -n "${ENCRYPTION_KEY}" ] && echo yes || echo NO - MISSING)"
echo "-------------------------"

# Ensure vendor dependencies are installed
if [ ! -f /app/vendor/autoload.php ]; then
    echo "Vendor directory missing or incomplete. Running composer install..."
    composer install -d /app --no-interaction --no-progress
else
    echo "Regenerating autoloader..."
    composer dump-autoload -d /app --quiet
fi

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
set +e
php /app/spark migrate --all -n App 2>&1
MIGRATE_EXIT=$?
set -e
if [ $MIGRATE_EXIT -eq 0 ]; then
    echo "Migrations complete."
else
    echo "WARNING: migrations failed with exit code $MIGRATE_EXIT"
    echo "Continuing startup despite migration failure..."
fi

exec apache2-foreground
