#!/bin/bash

# Automated Database Backup Script with Verification
# Usage: ./backup-database-automated.sh [retention_days]

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ayazlogistics}"
RETENTION_DAYS="${1:-30}"
DATABASE_NAME="${DATABASE_NAME:-ayazlogistics}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USERNAME="${DATABASE_USERNAME:-ayazlogistics_user}"
S3_BUCKET="${BACKUP_S3_BUCKET:-ayazlogistics-backups}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Send notification to Slack
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔄 Backup ${status}: ${message}\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Create backup directory
log "Creating backup directory..."
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="ayazlogistics_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.enc"

# Start backup
log "Starting database backup..."
send_notification "STARTED" "Database: ${DATABASE_NAME}, Time: ${TIMESTAMP}"

# Perform pg_dump
log "Running pg_dump..."
PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USERNAME" \
    -d "$DATABASE_NAME" \
    -F c \
    -b \
    -v \
    -f "$BACKUP_FILE" 2>&1 | tee backup.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    error "pg_dump failed!"
    send_notification "FAILED" "pg_dump error - see logs"
    exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Compress backup
log "Compressing backup..."
gzip -9 "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    error "Compression failed!"
    send_notification "FAILED" "Compression error"
    exit 1
fi

COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
log "Compressed to: $COMPRESSED_FILE ($COMPRESSED_SIZE)"

# Encrypt backup if encryption key is provided
if [ -n "$ENCRYPTION_KEY" ]; then
    log "Encrypting backup..."
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "$COMPRESSED_FILE" \
        -out "$ENCRYPTED_FILE" \
        -k "$ENCRYPTION_KEY"
    
    if [ $? -ne 0 ]; then
        error "Encryption failed!"
        send_notification "FAILED" "Encryption error"
        exit 1
    fi
    
    rm "$COMPRESSED_FILE"
    FINAL_FILE="$ENCRYPTED_FILE"
    log "Encrypted to: $ENCRYPTED_FILE"
else
    FINAL_FILE="$COMPRESSED_FILE"
    warn "Encryption key not provided - backup is not encrypted"
fi

# Calculate checksum
log "Calculating checksum..."
CHECKSUM=$(sha256sum "$FINAL_FILE" | cut -d' ' -f1)
echo "$CHECKSUM" > "${FINAL_FILE}.sha256"
log "Checksum: $CHECKSUM"

# Upload to S3 if configured
if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    aws s3 cp "$FINAL_FILE" "s3://${S3_BUCKET}/daily/${FINAL_FILE}" \
        --storage-class STANDARD_IA
    aws s3 cp "${FINAL_FILE}.sha256" "s3://${S3_BUCKET}/daily/${FINAL_FILE}.sha256"
    
    if [ $? -eq 0 ]; then
        log "Uploaded to S3 successfully"
    else
        warn "S3 upload failed - backup remains local only"
    fi
else
    warn "AWS CLI not available or S3_BUCKET not set - skipping S3 upload"
fi

# Verify backup integrity
log "Verifying backup integrity..."
if [ -n "$ENCRYPTION_KEY" ]; then
    # Decrypt and verify
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$ENCRYPTED_FILE" \
        -k "$ENCRYPTION_KEY" | gunzip | head -n 10 > /dev/null 2>&1
else
    # Verify compressed file
    gunzip -t "$COMPRESSED_FILE" 2>&1
fi

if [ $? -eq 0 ]; then
    log "✓ Backup integrity verified"
else
    error "✗ Backup integrity check failed!"
    send_notification "FAILED" "Integrity verification failed"
    exit 1
fi

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "ayazlogistics_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete
DELETED_COUNT=$(find "$BACKUP_DIR" -name "ayazlogistics_*.sql.gz*" -mtime +${RETENTION_DAYS} | wc -l)
log "Deleted $DELETED_COUNT old backup(s)"

# Create backup metadata
cat > "${FINAL_FILE}.meta" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "database": "${DATABASE_NAME}",
  "size": "$(stat -f%z "$FINAL_FILE" 2>/dev/null || stat -c%s "$FINAL_FILE")",
  "compressed_size": "${COMPRESSED_SIZE}",
  "checksum": "${CHECKSUM}",
  "encrypted": $([ -n "$ENCRYPTION_KEY" ] && echo "true" || echo "false"),
  "retention_days": ${RETENTION_DAYS}
}
EOF

# Final summary
FINAL_SIZE=$(du -h "$FINAL_FILE" | cut -f1)
TOTAL_BACKUPS=$(ls -1 ayazlogistics_*.sql.gz* 2>/dev/null | wc -l)

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✓ Backup completed successfully!"
log "  File: $FINAL_FILE"
log "  Size: $FINAL_SIZE"
log "  Checksum: $CHECKSUM"
log "  Total backups: $TOTAL_BACKUPS"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

send_notification "SUCCESS" "Size: ${FINAL_SIZE}, Checksum: ${CHECKSUM:0:16}..."

exit 0

