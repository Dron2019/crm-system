# CRM System — Server Deployment Guide (Without Docker)

Single subdomain deployment on a Linux server with Apache, PHP-FPM, MySQL, and Redis.

**Target URL:** `https://crm.yourdomain.com`
**Backend API:** `https://crm.yourdomain.com/api/v1/*`
**Frontend SPA:** `https://crm.yourdomain.com/*`

---

## 1. Server Requirements

| Component | Version | Purpose |
|-----------|---------|---------|
| Ubuntu / Debian | 22.04+ / 12+ | OS |
| PHP | 8.3+ | Laravel backend |
| MySQL | 8.0+ | Database |
| Redis | 7+ | Cache, sessions, queues |
| Apache | 2.4+ | Web server |
| Node.js | 18.x+ | Frontend build (build-time only) |
| Composer | 2.7+ | PHP dependency manager |
| Supervisor | 4+ | Queue worker process manager |
| Certbot | Latest | SSL certificates |

### PHP Extensions Required

```
php8.3-fpm php8.3-mysql php8.3-redis php8.3-xml php8.3-curl
php8.3-mbstring php8.3-zip php8.3-bcmath php8.3-intl php8.3-gd
php8.3-tokenizer php8.3-fileinfo php8.3-opcache
```

---

## 2. Server Setup

### 2.1 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Add PHP 8.3 repo (if not in default repos)
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install all dependencies
sudo apt install -y apache2 mysql-server redis-server supervisor curl git unzip \
  php8.3-fpm php8.3-mysql php8.3-redis php8.3-xml php8.3-curl \
  php8.3-mbstring php8.3-zip php8.3-bcmath php8.3-intl php8.3-gd \
  php8.3-tokenizer php8.3-fileinfo php8.3-opcache

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js 18 (for building frontend)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.2 Create Application User

```bash
sudo useradd -m -s /bin/bash crm
sudo usermod -aG www-data crm
```

### 2.3 Create Directory Structure

```bash
sudo mkdir -p /var/www/crm
sudo chown crm:www-data /var/www/crm
```

---

## 3. MySQL Setup

```bash
# Secure MySQL
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p <<'SQL'
CREATE DATABASE crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON crm.* TO 'crm'@'localhost';
FLUSH PRIVILEGES;
SQL
```

---

## 4. Redis Setup

Redis works out of the box. Optionally secure it:

```bash
# Edit /etc/redis/redis.conf
sudo nano /etc/redis/redis.conf

# Set a password (find and uncomment):
# requirepass YOUR_REDIS_PASSWORD

sudo systemctl restart redis
```

---

## 5. Deploy Application Code

### 5.1 Clone Repository

```bash
sudo -u crm bash
cd /var/www/crm

# Clone your repo (replace with your actual repo URL)
git clone YOUR_REPO_URL .
```

### 5.2 Install Backend Dependencies

```bash
cd /var/www/crm/backend
composer install --no-dev --optimize-autoloader
```

### 5.3 Configure Environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `/var/www/crm/backend/.env`:

```env
APP_NAME="CRM System"
APP_ENV=production
APP_KEY=              # auto-generated above
APP_DEBUG=false
APP_URL=https://crm.yourdomain.com
FRONTEND_URL=https://crm.yourdomain.com

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=crm
DB_USERNAME=crm
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

SESSION_DRIVER=redis
SESSION_LIFETIME=480
SESSION_ENCRYPT=true
SESSION_PATH=/
SESSION_DOMAIN=crm.yourdomain.com

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis

CACHE_STORE=redis

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=smtp.your-email-provider.com
MAIL_PORT=587
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD=YOUR_MAIL_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="CRM System"

SCOUT_DRIVER=database

SANCTUM_STATEFUL_DOMAINS=crm.yourdomain.com
```

### 5.4 Run Migrations & Seed

```bash
php artisan migrate --force
php artisan db:seed --force   # optional: creates demo data
```

### 5.5 Optimize Laravel

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan storage:link
```

### 5.6 Set Permissions

```bash
sudo chown -R crm:www-data /var/www/crm/backend
sudo chmod -R 755 /var/www/crm/backend
sudo chmod -R 775 /var/www/crm/backend/storage
sudo chmod -R 775 /var/www/crm/backend/bootstrap/cache
```

---

## 6. Build Frontend

```bash
cd /var/www/crm/frontend
npm ci

# Build for production (outputs to frontend/dist/)
npm run build
```

The built frontend will be served by Apache as static files.

---

## 7. Apache Configuration

Enable required Apache modules:

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

    # SSL (managed by Certbot — see step 8)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/crm.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/crm.yourdomain.com/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    # Frontend SPA
    DocumentRoot /var/www/crm/frontend/dist
    <Directory /var/www/crm/frontend/dist>
        AllowOverride None
        Require all granted
    </Directory>

    # Laravel API and Sanctum endpoints
    Alias /api /var/www/crm/backend/public
    Alias /sanctum /var/www/crm/backend/public
    <Directory /var/www/crm/backend/public>
        AllowOverride All
        Require all granted
    </Directory>

    # PHP-FPM for Laravel public/index.php
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost/"
    </FilesMatch>

    # SPA fallback for frontend routes only (exclude API/Sanctum)
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/(api|sanctum) [NC]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ /index.html [L]

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Cache static assets
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    ErrorLog ${APACHE_LOG_DIR}/crm-error.log
    CustomLog ${APACHE_LOG_DIR}/crm-access.log combined
</VirtualHost>
```

Enable the site:

```bash
sudo a2ensite crm.conf
sudo a2dissite 000-default.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## 8. SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-apache

# Get certificate (run BEFORE enabling SSL in apache config,
# or temporarily use the HTTP-only block)
sudo certbot --apache -d crm.yourdomain.com

# Auto-renewal is set up automatically. Verify:
sudo certbot renew --dry-run
```

---

## 9. Queue Worker (Supervisor)

Create `/etc/supervisor/conf.d/crm-worker.conf`:

```ini
[program:crm-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/crm/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=crm
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/crm/backend/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start crm-worker:*
```

---

## 10. PHP-FPM Tuning

Edit `/etc/php/8.3/fpm/pool.d/www.conf`:

```ini
user = crm
group = www-data

pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 8
pm.max_requests = 1000

; OPcache is critical for production
php_admin_value[opcache.enable] = 1
php_admin_value[opcache.memory_consumption] = 128
php_admin_value[opcache.max_accelerated_files] = 10000
php_admin_value[opcache.validate_timestamps] = 0
```

```bash
sudo systemctl restart php8.3-fpm
```

---

## 11. Scheduled Tasks (Cron)

```bash
sudo crontab -u crm -e
```

Add:

```cron
* * * * * cd /var/www/crm/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 12. Deployment Script (Updates)

Create `/var/www/crm/deploy.sh`:

```bash
#!/bin/bash
set -e

cd /var/www/crm

echo ">>> Pulling latest code..."
git pull origin main

echo ">>> Backend: Installing dependencies..."
cd backend
composer install --no-dev --optimize-autoloader

echo ">>> Backend: Running migrations..."
php artisan migrate --force

echo ">>> Backend: Clearing caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo ">>> Frontend: Installing & building..."
cd ../frontend
npm ci
npm run build

echo ">>> Restarting services..."
sudo systemctl reload php8.3-fpm
sudo supervisorctl restart crm-worker:*

echo ">>> Deployment complete!"
```

```bash
chmod +x /var/www/crm/deploy.sh
```

Run deployments with: `sudo -u crm /var/www/crm/deploy.sh`

---

## 13. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
```

---

## 14. Monitoring & Logs

| Log | Location |
|-----|----------|
| Laravel app | `/var/www/crm/backend/storage/logs/laravel.log` |
| Queue worker | `/var/www/crm/backend/storage/logs/worker.log` |
| Apache access | `/var/log/apache2/access.log` |
| Apache error | `/var/log/apache2/error.log` |
| PHP-FPM | `/var/log/php8.3-fpm.log` |
| MySQL | `/var/log/mysql/error.log` |

### Log Rotation

Laravel logs rotate daily (configured via `LOG_STACK=daily`).

For worker logs, add to `/etc/logrotate.d/crm`:

```
/var/www/crm/backend/storage/logs/worker.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
}
```

---

## 15. Quick Verification Checklist

After deployment, verify:

```bash
# MySQL
mysql -u crm -p -e "SHOW DATABASES;" | grep crm

# Redis
redis-cli ping   # should return PONG

# PHP-FPM
sudo systemctl status php8.3-fpm

# Apache
sudo apache2ctl configtest && sudo systemctl status apache2

# Laravel
cd /var/www/crm/backend
php artisan about          # shows app info
php artisan migrate:status # all migrations ran

# Frontend
ls -la /var/www/crm/frontend/dist/index.html   # exists

# Queue
sudo supervisorctl status crm-worker:*

# HTTPS
curl -I https://crm.yourdomain.com  # should return 200
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway | Check `php8.3-fpm` is running: `sudo systemctl restart php8.3-fpm` |
| 403 Forbidden | Check ownership: `sudo chown -R crm:www-data /var/www/crm` |
| CSRF token mismatch | Verify `SESSION_DOMAIN` and `SANCTUM_STATEFUL_DOMAINS` match your domain |
| API returns HTML | Ensure Apache `Alias /api` and Laravel public `.htaccess` rewrite are active |
| Queue jobs not running | Check supervisor: `sudo supervisorctl status` |
| Slow responses | Enable OPcache and verify `config:cache` ran |
 