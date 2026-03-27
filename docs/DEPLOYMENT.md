# CRM System - Production Deployment Guide

Single-domain deployment without Docker and without Redis.

Target layout:
- Laravel API: `/api/v1/*`
- Sanctum: `/sanctum/*`
- React SPA: `/*`
- Domain: `https://crm.yourdomain.com`

Frontend build output is unified into Laravel public assets at `public/spa`.

---

## 1. Requirements

- Ubuntu 22.04+ or Debian 12+
- Apache 2.4+
- PHP 8.3+ with FPM
- MySQL 8.0+ (or compatible)
- Node.js 20+ (build-time only)
- Composer 2.7+
- Git

PHP extensions:

```bash
php8.3-fpm php8.3-mysql php8.3-xml php8.3-curl php8.3-mbstring \
php8.3-zip php8.3-bcmath php8.3-intl php8.3-gd php8.3-tokenizer \
php8.3-fileinfo php8.3-opcache
```

---

## 2. Install Server Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

sudo apt install -y apache2 mysql-server curl git unzip \
  php8.3-fpm php8.3-mysql php8.3-xml php8.3-curl php8.3-mbstring \
  php8.3-zip php8.3-bcmath php8.3-intl php8.3-gd php8.3-tokenizer \
  php8.3-fileinfo php8.3-opcache

curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Database Setup

```bash
sudo mysql -u root -p <<'SQL'
CREATE DATABASE crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON crm.* TO 'crm'@'localhost';
FLUSH PRIVILEGES;
SQL
```

---

## 4. Deploy Code

```bash
sudo useradd -m -s /bin/bash crm || true
sudo usermod -aG www-data crm

sudo mkdir -p /var/www/crm
sudo chown -R crm:www-data /var/www/crm

sudo -u crm bash -lc 'cd /var/www/crm && git clone YOUR_REPO_URL .'
```

---

## 5. Configure Backend

```bash
sudo -u crm bash -lc '
cd /var/www/crm
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
'
```

Update `/var/www/crm/.env`:

```env
APP_NAME="CRM System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://crm.yourdomain.com
FRONTEND_URL=https://crm.yourdomain.com

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=crm
DB_USERNAME=crm
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

SESSION_DRIVER=file
SESSION_LIFETIME=480
SESSION_ENCRYPT=true
SESSION_PATH=/
SESSION_DOMAIN=crm.yourdomain.com
SESSION_SECURE_COOKIE=true

CACHE_STORE=file
QUEUE_CONNECTION=sync

FILESYSTEM_DISK=local

SCOUT_DRIVER=null

SANCTUM_STATEFUL_DOMAINS=crm.yourdomain.com
CORS_ALLOWED_ORIGINS=https://crm.yourdomain.com

MAIL_MAILER=smtp
MAIL_HOST=smtp.your-email-provider.com
MAIL_PORT=587
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD=YOUR_MAIL_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="CRM System"
```

Run migrations and optimizations:

```bash
sudo -u crm bash -lc '
cd /var/www/crm
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
'
```

Set permissions:

```bash
sudo chown -R crm:www-data /var/www/crm
sudo chmod -R 755 /var/www/crm
sudo chmod -R 775 /var/www/crm/storage
sudo chmod -R 775 /var/www/crm/bootstrap/cache
```

---

## 6. Build Frontend Into Backend Public

```bash
sudo -u crm bash -lc '
cd /var/www/crm
npm ci
npm run build
'
```

Expected output:
- `public/spa/index.html`
- `public/spa/assets/*`

Laravel route fallback in `routes/web.php` serves this SPA on the same domain.

---

## 7. Apache Virtual Host (Single Domain)

Enable modules:

```bash
sudo a2enmod rewrite headers proxy_fcgi setenvif expires ssl
```

Create `/etc/apache2/sites-available/crm.conf`:

```apache
<VirtualHost *:80>
    ServerName crm.yourdomain.com
    Redirect permanent / https://crm.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName crm.yourdomain.com

    DocumentRoot /var/www/crm/public

    <Directory /var/www/crm/public>
        AllowOverride All
        Require all granted
    </Directory>

    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost/"
    </FilesMatch>

    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    ErrorLog ${APACHE_LOG_DIR}/crm-error.log
    CustomLog ${APACHE_LOG_DIR}/crm-access.log combined
</VirtualHost>
```

Enable site:

```bash
sudo a2ensite crm.conf
sudo a2dissite 000-default.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## 8. SSL Certificate

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d crm.yourdomain.com
sudo certbot renew --dry-run
```

---

## 9. Cron Scheduler

```bash
sudo crontab -u crm -e
```

Add:

```cron
* * * * * cd /var/www/crm && php artisan schedule:run >> /dev/null 2>&1
```

---

## 10. Deploy Script

Create `/var/www/crm/deploy.sh`:

```bash
#!/bin/bash
set -e

cd /var/www/crm

echo ">>> Pull latest code"
git pull origin main

echo ">>> Backend install"
cd /var/www/crm
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo ">>> Frontend build"
cd ../frontend
npm ci
npm run build

echo ">>> Reload PHP-FPM"
sudo systemctl reload php8.3-fpm

echo ">>> Done"
```

```bash
sudo chmod +x /var/www/crm/deploy.sh
```

Run:

```bash
sudo -u crm /var/www/crm/deploy.sh
```

---

## 11. Verification Checklist

```bash
# App health
curl -I https://crm.yourdomain.com
curl -I https://crm.yourdomain.com/api/v1/health

# Laravel
cd /var/www/crm
php artisan about
php artisan migrate:status

# Frontend bundle exists
ls -la /var/www/crm/public/spa/index.html

# Services
sudo systemctl status apache2
sudo systemctl status php8.3-fpm
```

If `/api/v1/health` does not exist in your routes, test any known API endpoint instead.

---

## 12. Notes

- No Docker is required for this deployment flow.
- No Redis is required; queue defaults to `sync`, cache/session use local file/array drivers.
- If background jobs become necessary later, switch to `QUEUE_CONNECTION=database` and run a worker via Supervisor.
