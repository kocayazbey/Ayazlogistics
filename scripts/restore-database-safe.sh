#!/bin/bash

# Safe Database Restore Script with Pre-restore Backup
# Usage: ./restore-database-safe.sh <backup_file>

set -e

BACKUP_FILE="$1"
DATABASE_NAME="${DATABASE_NAME:-ayazlogistics}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USERNAME="${DATABASE_USERNAME:-ayazlogistics_user}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
TEMP_DIR="/tmp/ayaz_restore_$$"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AyazLogistics Safe Database Restore"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  WARNING: This will restore the database from backup"
echo "   Database: $DATABASE_NAME"
echo "   Backup: $BACKUP_FILE"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Create pre-restore backup
echo ""
echo "Step 1: Creating pre-restore backup..."
PRE_RESTORE_BACKUP="pre_restore_$(date +%Y%m%d_%H%M%S).sql"
PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -d "$DATABASE_NAME" \
    -F c \
    -f "/var/backups/ayazlogistics/$PRE_RESTORE_BACKUP"
echo "✓ Pre-restore backup created: $PRE_RESTORE_BACKUP"

# Verify backup file
echo ""
echo "Step 2: Verifying backup file..."
bash "$(dirname "$0")/verify-backup.sh" "$BACKUP_FILE"

# Prepare restore
echo ""
echo "Step 3: Preparing restore..."
mkdir -p "$TEMP_DIR"

if [[ "$BACKUP_FILE" == *.enc ]]; then
    echo "Decrypting..."
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$BACKUP_FILE" \
        -out "$TEMP_DIR/backup.sql.gz" \
        -k "$ENCRYPTION_KEY"
    RESTORE_FILE="$TEMP_DIR/backup.sql.gz"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Terminate connections
echo ""
echo "Step 4: Terminating database connections..."
PGPASSWORD="$DATABASE_PASSWORD" psql \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DATABASE_NAME}' AND pid <> pg_backend_pid();"

# Perform restore
echo ""
echo "Step 5: Restoring database..."
gunzip -c "$RESTORE_FILE" | PGPASSWORD="$DATABASE_PASSWORD" pg_restore \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -d "$DATABASE_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    -v

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully"
else
    echo "✗ Restore failed!"
    echo "Pre-restore backup available at: $PRE_RESTORE_BACKUP"
    exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Restore completed successfully!"
echo "  Pre-restore backup: $PRE_RESTORE_BACKUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0

