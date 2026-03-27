#!/usr/bin/env bash

set -e

echo "Running Laravel maintenance tasks..."

php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "Done."