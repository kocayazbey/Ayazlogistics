#!/bin/bash

# Database Restore Script for AyazLogistics
# Restores PostgreSQL database from backup

set -e

# Configuration
BACKUP_DIR="/var/backups/ayazlogistics"
LOG_FILE="/var/log/ayazlogistics/restore.log"

# Database Configuration
DB_NAME="${POSTGRES_DB:-ayazlogistics}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to list available backups
list_backups() {
    echo "Available backups:"
    echo "=================="
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
}

# Function to restore from backup
restore_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        exit 1
    fi
    
    # Confirmation
    read -p "This will restore database from: $(basename $backup_file). Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
    
    # Export password
    export PGPASSWORD="${POSTGRES_PASSWORD}"
    
    # Create backup of current database
    log "Creating backup of current database..."
    SAFETY_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=custom --compress=9 \
        --file="$SAFETY_BACKUP"
    log "Safety backup created: $SAFETY_BACKUP"
    
    # Terminate existing connections
    log "Terminating existing connections..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF
    
    # Drop and recreate database
    log "Dropping database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF
    
    # Restore from backup
    log "Restoring database from backup..."
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$backup_file"; then
        
        log "Database restored successfully"
    else
        log "ERROR: Restore failed! Restoring safety backup..."
        
        # Restore safety backup
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF
        
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            "$SAFETY_BACKUP"
        
        log "Safety backup restored"
        exit 1
    fi
    
    # Verify restore
    log "Verifying restore..."
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    log "Restore verification: $TABLE_COUNT tables found"
    
    # Clean up
    unset PGPASSWORD
    
    log "Restore completed successfully"
}

# Main script
case "$1" in
    list)
        list_backups
        ;;
    restore)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore <backup_file>"
            list_backups
            exit 1
        fi
        restore_backup "$2"
        ;;
    latest)
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/ayazlogistics_backup_*.sql.gz | head -1)
        if [ -z "$LATEST_BACKUP" ]; then
            log "ERROR: No backups found"
            exit 1
        fi
        restore_backup "$LATEST_BACKUP"
        ;;
    *)
        echo "Usage: $0 {list|restore <file>|latest}"
        exit 1
        ;;
esac

exit 0
