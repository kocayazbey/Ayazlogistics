#!/bin/bash

# Verify the latest backup
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ayazlogistics}"
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/ayazlogistics_*.sql.gz* 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "Error: No backups found in $BACKUP_DIR"
    exit 1
fi

echo "Verifying latest backup: $LATEST_BACKUP"
exec "$(dirname "$0")/verify-backup.sh" "$LATEST_BACKUP"

