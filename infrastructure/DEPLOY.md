# OGDEN Atlas — Production Deployment Guide

Deploy the full Atlas stack (API + frontend + database + cache + reverse proxy) on a fresh Ubuntu 24.04 VPS.

## Prerequisites

- Ubuntu 24.04 LTS VPS (minimum 2 vCPU, 4 GB RAM, 40 GB SSD)
- Domain name pointed to the server IP (A record for `atlas.ogden.ag`)
- SSH access with a sudo user

## 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (official method)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin (included with Docker Engine 24+)
docker compose version  # verify

# Log out and back in for group membership to take effect
exit
```

## 2. Clone the Repository

```bash
cd /opt
sudo mkdir ogden-atlas && sudo chown $USER:$USER ogden-atlas
git clone https://github.com/onaxyzogden/atlas.git ogden-atlas
cd ogden-atlas/infrastructure
```

## 3. Configure Environment

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod` and fill in all values:

```bash
nano .env.prod
```

**Required values:**

| Variable | How to generate |
|----------|----------------|
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` |
| `REDIS_PASSWORD` | `openssl rand -base64 24` |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `MAPTILER_KEY` | Create at [maptiler.com](https://www.maptiler.com/) |
| `CESIUM_ION_TOKEN` | Create at [ion.cesium.com/tokens](https://ion.cesium.com/tokens) |
| `DOMAIN` | Your domain (e.g., `atlas.ogden.ag`) |

## 4. Update Nginx Domain

If your domain is not `atlas.ogden.ag`, update the `server_name` in the nginx config:

```bash
sed -i 's/atlas.ogden.ag/YOUR_DOMAIN/g' nginx/conf.d/default.conf
```

## 5. Build and Start

```bash
# Build images and start all services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Watch logs during first startup
docker compose -f docker-compose.prod.yml logs -f
```

Verify the stack is healthy:

```bash
docker compose -f docker-compose.prod.yml ps

# Test the health endpoint
curl http://localhost/health
# Expected: {"status":"ok","timestamp":"...","version":"0.1.0"}
```

At this point the site is accessible over HTTP on port 80.

## 6. Obtain SSL Certificate

```bash
# Run certbot to get Let's Encrypt certificates
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d YOUR_DOMAIN \
  --email admin@yourdomain.com \
  --agree-tos --no-eff-email
```

After certbot succeeds, enable HTTPS in nginx:

```bash
nano nginx/conf.d/default.conf
```

1. Uncomment the `return 301 https://...` redirect in the HTTP server block
2. Remove the temporary HTTP location blocks (API proxy, static files)
3. Uncomment the entire HTTPS `server { ... }` block
4. Replace `atlas.ogden.ag` with your domain in the SSL paths

Reload nginx:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Verify HTTPS works:

```bash
curl https://YOUR_DOMAIN/health
```

## 7. Automatic Certificate Renewal

Add a cron job to renew certificates:

```bash
sudo crontab -e
```

Add this line (runs twice daily, as certbot recommends):

```
0 3,15 * * * cd /opt/ogden-atlas/infrastructure && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload >> /var/log/certbot-renew.log 2>&1
```

## 8. Firewall Configuration

```bash
# Allow only HTTP, HTTPS, and SSH
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verify — PostgreSQL (5432) and Redis (6379) should NOT be listed
sudo ufw status
```

## Maintenance

### View logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Single service
docker compose -f docker-compose.prod.yml logs -f api
```

### Redeploy after code changes

```bash
cd /opt/ogden-atlas
git pull origin main
cd infrastructure
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api web
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Database backup

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U ogden ogden_atlas | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Database restore

```bash
gunzip -c backup-YYYYMMDD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U ogden ogden_atlas
```

### Run database migrations

Migrations in `apps/api/src/db/migrations/` run automatically on first Postgres start (via `docker-entrypoint-initdb.d`). For subsequent migrations:

```bash
docker compose -f docker-compose.prod.yml exec api \
  node dist/db/migrate.js
```

### Scale the API

```bash
# Run 3 API instances behind nginx
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --scale api=3
```

Update `nginx/conf.d/default.conf` upstream block to use Docker DNS:

```nginx
upstream api_backend {
    server api:3001;
    # Docker Compose DNS resolves to all scaled replicas
}
```

## Architecture

```
                    Internet
                       |
                  [80] [443]
                       |
                    ┌──────┐
                    │ nginx │ ← SSL termination, gzip, static file caching
                    └──┬───┘
               ┌───────┼───────┐
               │               │
          /api/*          /* (static)
               │               │
          ┌────┴────┐    ┌─────┴─────┐
          │ Fastify │    │ React SPA │
          │  :3001  │    │ (pre-built│
          └────┬────┘    │  in nginx)│
          ┌────┼────┐    └───────────┘
          │         │
     ┌────┴───┐ ┌───┴───┐
     │Postgres│ │ Redis │
     │ :5432  │ │ :6379 │   ← internal only, no public ports
     └────────┘ └───────┘
```
