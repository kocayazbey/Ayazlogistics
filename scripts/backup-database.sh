#!/bin/bash

# Database Backup Script for AyazLogistics
# Performs automated PostgreSQL backups with compression and retention

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/ayazlogistics"
BACKUP_FILE="ayazlogistics_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30
LOG_FILE="/var/log/ayazlogistics/backup.log"

# Database Configuration
DB_NAME="${POSTGRES_DB:-ayazlogistics}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# S3 Configuration (optional)
S3_BUCKET="${BACKUP_S3_BUCKET:-ayazlogistics-backups}"
AWS_REGION="${AWS_REGION:-eu-central-1}"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send notification
notify() {
    local status=$1
    local message=$2
    
    # Send Slack notification (optional)
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[Backup ${status}] ${message}\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    log "$message"
}

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log "Starting database backup..."

# Export password for pg_dump
export PGPASSWORD="${POSTGRES_PASSWORD}"

# Perform backup
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${BACKUP_DIR}/${BACKUP_FILE}"; then
    
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    notify "SUCCESS" "Backup completed successfully. Size: ${BACKUP_SIZE}"
else
    notify "FAILED" "Backup failed!"
    exit 1
fi

# Upload to S3 (if configured)
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    log "Uploading backup to S3..."
    
    if aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
        "s3://${S3_BUCKET}/daily/${BACKUP_FILE}" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA; then
        
        notify "SUCCESS" "Backup uploaded to S3"
    else
        notify "WARNING" "Failed to upload backup to S3"
    fi
fi

# Clean up old backups (local)
log "Cleaning up old local backups..."
find "$BACKUP_DIR" -name "ayazlogistics_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
log "Old backups removed (retention: ${RETENTION_DAYS} days)"

# Clean up old S3 backups (if configured)
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    log "Cleaning up old S3 backups..."
    aws s3 ls "s3://${S3_BUCKET}/daily/" | \
        awk '{print $4}' | \
        while read file; do
            if [ ! -z "$file" ]; then
                file_date=$(echo "$file" | grep -oP '\d{8}' | head -1)
                if [ ! -z "$file_date" ]; then
                    days_old=$(( ($(date +%s) - $(date -d "$file_date" +%s)) / 86400 ))
                    if [ $days_old -gt $RETENTION_DAYS ]; then
                        aws s3 rm "s3://${S3_BUCKET}/daily/${file}"
                        log "Deleted old S3 backup: $file"
                    fi
                fi
            fi
        done
fi

# Create weekly backup (every Sunday)
if [ $(date +%u) -eq 7 ]; then
    log "Creating weekly backup..."
    cp "${BACKUP_DIR}/${BACKUP_FILE}" "${BACKUP_DIR}/weekly_backup_${TIMESTAMP}.sql.gz"
    
    if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
        aws s3 cp "${BACKUP_DIR}/weekly_backup_${TIMESTAMP}.sql.gz" \
            "s3://${S3_BUCKET}/weekly/" \
            --region "$AWS_REGION" \
            --storage-class GLACIER
    fi
fi

# Create monthly backup (first day of month)
if [ $(date +%d) -eq 01 ]; then
    log "Creating monthly backup..."
    cp "${BACKUP_DIR}/${BACKUP_FILE}" "${BACKUP_DIR}/monthly_backup_${TIMESTAMP}.sql.gz"
    
    if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
        aws s3 cp "${BACKUP_DIR}/monthly_backup_${TIMESTAMP}.sql.gz" \
            "s3://${S3_BUCKET}/monthly/" \
            --region "$AWS_REGION" \
            --storage-class GLACIER
    fi
fi

# Verify backup integrity
log "Verifying backup integrity..."
if pg_restore -l "${BACKUP_DIR}/${BACKUP_FILE}" > /dev/null 2>&1; then
    notify "SUCCESS" "Backup integrity verified"
else
    notify "WARNING" "Backup integrity check failed!"
fi

# Generate backup report
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

cat > "${BACKUP_DIR}/backup_report.txt" << EOF
Database Backup Report
=====================
Timestamp: $(date)
Database: $DB_NAME
Backup File: $BACKUP_FILE
Backup Size: $BACKUP_SIZE
Total Backups: $TOTAL_BACKUPS
Total Size: $TOTAL_SIZE
Retention Policy: ${RETENTION_DAYS} days
Status: SUCCESS
EOF

log "Backup completed successfully"

# Clean up
unset PGPASSWORD

exit 0
