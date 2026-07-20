# Deployment Guide — Herman AI

## Prasyarat VPS

| Spesifikasi | Minimal |
|---|---|
| **CPU** | 2 core |
| **RAM** | 4 GB |
| **Storage** | 20 GB SSD |
| **OS** | Ubuntu 22.04 / 24.04 LTS |
| **Domain** | Siapkan domain misal `api.domainmu.com` A record ke IP VPS |

## 1. Install Docker & Docker Compose

```bash
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y
docker compose version
```

## 2. Clone Project

```bash
git clone git@github.com:muhammadroyyan11/herman-ai-apps.git
cd herman-ai-apps
```

## 3. Setup Environment

```bash
cp .env.example .env
nano .env
```

### Variabel wajib diisi:

| Variabel | Contoh | Keterangan |
|---|---|---|
| `APP_ENV` | `production` | Mode produksi |
| `APP_SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_hex(32))"` | Generate random |
| `JWT_SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_hex(32))"` | Generate random |
| `DEEPSEEK_API_KEY` | `sk-xxx` | API key dari DeepSeek |
| `MYSQL_ROOT_PASSWORD` | `root_pass` | Ganti dari default |
| `MYSQL_PASSWORD` | `herman_pass` | Ganti dari default |
| `APP_ALLOWED_ORIGINS` | `https://domainmu.com,https://admin.domainmu.com` | Domain frontend |

## 4. Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d api.domainmu.com

# Copy cert ke folder nginx
sudo mkdir -p infra/docker/nginx/ssl
sudo cp /etc/letsencrypt/live/api.domainmu.com/fullchain.pem infra/docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/api.domainmu.com/privkey.pem infra/docker/nginx/ssl/
```

Edit `infra/docker/nginx/nginx.conf`:
- Ganti `server_name api.herman-ai.com` → `server_name api.domainmu.com`

## 5. Jalankan Services

```bash
docker compose up -d

# Cek status
docker compose ps
docker compose logs backend

# Cek health
curl http://localhost:8000/health
```

## 6. Migrasi Database

```bash
docker compose exec backend alembic upgrade head

# Atau jalankan init_db langsung
docker compose exec backend python3 -c "
import asyncio
from app.core.database import init_db
asyncio.run(init_db())
print('Database initialized')
"
```

## 7. Monitoring & Maintenance

### Logs

```bash
# Semua service
docker compose logs -f

# Service spesifik
docker compose logs -f backend
docker compose logs -f mysql
```

### Restart

```bash
docker compose restart backend
docker compose restart nginx
```

### Backup Database

```bash
docker compose exec mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" herman_ai > backup-$(date +%Y%m%d).sql
```

### Update Aplikasi

```bash
git pull origin main
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

## 8. Deploy Frontend (Web)

```bash
cd apps/web
npm install
npm run build
```

Hasil build di folder `dist/` — deploy ke Vercel/Netlify atau taruh di Nginx server sendiri.

Untuk Mobile (APK/IPA) build via **EAS Build**:

```bash
cd apps/mobile
npx eas build --platform android  # atau ios
```

## 9. Auto-Renew SSL

```bash
crontab -e
# Tambahkan baris:
0 3 * * * certbot renew --quiet && docker compose restart nginx
```

## Catatan Penting

- Jangan commit `.env` ke git (sudah di `.gitignore`)
- Ganti semua default password sebelum go-live
- Pastikan port **80** dan **443** terbuka di firewall VPS
- Untuk production, matikan `APP_DEBUG=true` → `APP_DEBUG=false`
- Sesuaikan `APP_ALLOWED_ORIGINS` dengan domain yang dipakai
- Jika ingin akses phpMyAdmin: jalankan container terpisah
- Pantau resource VPS: `htop`, `docker stats`
