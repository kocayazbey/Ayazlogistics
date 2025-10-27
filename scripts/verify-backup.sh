#!/bin/bash

# Backup Verification Script
# Usage: ./verify-backup.sh <backup_file>

set -e

BACKUP_FILE="$1"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# Check if encrypted
if [[ "$BACKUP_FILE" == *.enc ]]; then
    echo "✓ Encrypted backup detected"
    
    if [ -z "$ENCRYPTION_KEY" ]; then
        echo "✗ Encryption key not provided"
        exit 1
    fi
    
    echo "Decrypting and verifying..."
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$BACKUP_FILE" \
        -k "$ENCRYPTION_KEY" | gunzip | head -n 100 > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "✓ Decryption and integrity check passed"
    else
        echo "✗ Decryption or integrity check failed"
        exit 1
    fi
elif [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "✓ Compressed backup detected"
    gunzip -t "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✓ Compression integrity check passed"
    else
        echo "✗ Compression integrity check failed"
        exit 1
    fi
else
    echo "✗ Unknown backup format"
    exit 1
fi

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    echo "Verifying checksum..."
    EXPECTED_CHECKSUM=$(cat "$CHECKSUM_FILE")
    ACTUAL_CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
    
    if [ "$EXPECTED_CHECKSUM" == "$ACTUAL_CHECKSUM" ]; then
        echo "✓ Checksum verification passed"
    else
        echo "✗ Checksum mismatch!"
        echo "  Expected: $EXPECTED_CHECKSUM"
        echo "  Actual: $ACTUAL_CHECKSUM"
        exit 1
    fi
fi

# Check metadata
META_FILE="${BACKUP_FILE}.meta"
if [ -f "$META_FILE" ]; then
    echo "Backup metadata:"
    cat "$META_FILE" | jq '.' 2>/dev/null || cat "$META_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ All verification checks passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0

