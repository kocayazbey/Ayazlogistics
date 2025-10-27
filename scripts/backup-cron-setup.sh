#!/bin/bash

# Setup automated backup cron jobs
# Usage: sudo ./backup-cron-setup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_FILE="/etc/cron.d/ayazlogistics-backup"

echo "Setting up automated backup cron jobs..."

# Create cron configuration
cat > "$CRON_FILE" <<EOF
# AyazLogistics Automated Backup Schedule
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
BACKUP_DIR=/var/backups/ayazlogistics
BACKUP_S3_BUCKET=ayazlogistics-backups

# Daily backup at 2 AM
0 2 * * * root ${SCRIPT_DIR}/backup-database-automated.sh 30 >> /var/log/ayazlogistics-backup.log 2>&1

# Weekly full backup on Sunday at 3 AM (90 days retention)
0 3 * * 0 root ${SCRIPT_DIR}/backup-database-automated.sh 90 >> /var/log/ayazlogistics-backup-weekly.log 2>&1

# Monthly backup on 1st day at 4 AM (365 days retention)
0 4 1 * * root ${SCRIPT_DIR}/backup-database-automated.sh 365 >> /var/log/ayazlogistics-backup-monthly.log 2>&1

# Verify daily backup at 3 AM
0 3 * * * root ${SCRIPT_DIR}/verify-latest-backup.sh >> /var/log/ayazlogistics-verify.log 2>&1
EOF

# Set permissions
chmod 644 "$CRON_FILE"

# Create log directory
mkdir -p /var/log
touch /var/log/ayazlogistics-backup.log
touch /var/log/ayazlogistics-verify.log

echo "✓ Cron jobs configured:"
echo "  - Daily backup: 2 AM (30 days retention)"
echo "  - Weekly backup: Sunday 3 AM (90 days retention)"
echo "  - Monthly backup: 1st day 4 AM (365 days retention)"
echo "  - Daily verification: 3 AM"
echo ""
echo "Logs:"
echo "  - /var/log/ayazlogistics-backup.log"
echo "  - /var/log/ayazlogistics-verify.log"

exit 0

