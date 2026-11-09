#!/usr/bin/env bash
# TrackSentinel — Hetzner Server Bootstrap Script
# Target OS: Ubuntu 22.04 / 24.04 LTS
# Usage: Run as root on a fresh Hetzner server:
#   curl -sSL https://raw.githubusercontent.com/Elmun-Technologies/tracksentinel/main/scripts/setup-server.sh | sudo bash

set -euo pipefail

echo "🛡️  Starting TrackSentinel Hetzner Server Bootstrap..."

# 1. Update system packages
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git ufw certbot python3-certbot-nginx nginx

# 2. Configure UFW Firewall (Never expose DB or internal ports)
echo "🔒 Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Certbot & redirect)
ufw allow 443/tcp  # HTTPS
ufw --force enable

# 3. Install Docker Engine & Compose if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# 4. Create deployment directories
DEPLOY_DIR="/opt/tracksentinel"
BACKUP_DIR="${DEPLOY_DIR}/backups"

mkdir -p "${DEPLOY_DIR}" "${BACKUP_DIR}"
echo "📁 Created deployment directory at ${DEPLOY_DIR}"

# 5. Clone repository if not present
if [ ! -d "${DEPLOY_DIR}/.git" ]; then
    echo "📥 Cloning TrackSentinel repository..."
    git clone https://github.com/Elmun-Technologies/tracksentinel.git "${DEPLOY_DIR}"
fi

cd "${DEPLOY_DIR}"

# 6. Copy sample production env if not already created
if [ ! -f "${DEPLOY_DIR}/.env.production" ]; then
    cp "${DEPLOY_DIR}/.env.example" "${DEPLOY_DIR}/.env.production"
    echo "⚠️  Created ${DEPLOY_DIR}/.env.production. Please edit it with your real domain and secrets!"
fi

# 7. Set executable permissions
chmod +x "${DEPLOY_DIR}/scripts/"*.sh

# 8. Setup daily backup cron job
CRON_JOB="0 3 * * * ${DEPLOY_DIR}/scripts/backup-db.sh ${BACKUP_DIR} >> /var/log/tracksentinel-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -F "${DEPLOY_DIR}/scripts/backup-db.sh") || (crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -

echo "✅ Hetzner server bootstrap complete!"
echo "Next steps:"
echo " 1. nano /opt/tracksentinel/.env.production (fill in your secrets)"
echo " 2. cd /opt/tracksentinel && docker compose -f docker-compose.prod.yml up -d --build"
echo " 3. docker exec -i tracksentinel_postgres psql -U tracksentinel -d tracksentinel < packages/db/migrations/0000_brave_smasher.sql"
echo " 4. sudo cp docker/nginx-site.conf /etc/nginx/sites-available/tracksentinel"
echo " 5. sudo certbot --nginx -d your-app-domain.com"
