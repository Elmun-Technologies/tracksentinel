#!/usr/bin/env bash
# TrackSentinel — Automated PostgreSQL Backup Script
# Usage: ./scripts/backup-db.sh [backup_dir]

set -euo pipefail

BACKUP_DIR="${1:-/opt/tracksentinel/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="tracksentinel_postgres"
DB_NAME="${POSTGRES_DB:-tracksentinel}"
DB_USER="${POSTGRES_USER:-tracksentinel}"

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/tracksentinel_${TIMESTAMP}.sql.gz"

echo "📦 Creating PostgreSQL backup: ${BACKUP_FILE}..."

docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "✅ Backup successfully created ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Retention: keep last 14 days of backups
echo "🧹 Removing backups older than 14 days..."
find "${BACKUP_DIR}" -name "tracksentinel_*.sql.gz" -mtime +14 -delete

echo "Done."

