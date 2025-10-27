#!/bin/bash
# Telemetry retention management script for AyazLogistics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
RETENTION_CONFIG="${RETENTION_CONFIG:-k8s/telemetry/tsdb-config.yaml}"
BACKUP_DIR="${BACKUP_DIR:-/backup/telemetry}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

# Check if required tools are installed
check_dependencies() {
    log_info "Checking telemetry retention dependencies..."
    
    # Check for curl
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed"
        exit 1
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        exit 1
    fi
    
    # Check for gzip
    if ! command -v gzip &> /dev/null; then
        log_error "gzip is not installed"
        exit 1
    fi
    
    log_info "All dependencies are installed"
}

# Get retention policy from config
get_retention_policy() {
    log_info "Reading retention policy from config..."
    
    if [ ! -f "$RETENTION_CONFIG" ]; then
        log_error "Retention config file not found: $RETENTION_CONFIG"
        exit 1
    fi
    
    # Extract retention policy from YAML
    local policy=$(grep -A 1000 "retention-policy.yml:" "$RETENTION_CONFIG" | grep -v "retention-policy.yml:" | head -n -1)
    
    if [ -z "$policy" ]; then
        log_error "Retention policy not found in config"
        exit 1
    fi
    
    echo "$policy"
}

# Get metrics from Prometheus
get_metrics() {
    local metric_name="$1"
    local start_time="$2"
    local end_time="$3"
    
    log_debug "Getting metrics for $metric_name from $start_time to $end_time"
    
    local query="query_range?query=$metric_name&start=$start_time&end=$end_time&step=1m"
    local url="$PROMETHEUS_URL/api/v1/$query"
    
    curl -s "$url" | jq '.data.result'
}

# Calculate retention period
calculate_retention_period() {
    local duration="$1"
    local current_time=$(date +%s)
    
    case "$duration" in
        *d)
            local days=$(echo "$duration" | sed 's/d//')
            local retention_seconds=$((days * 24 * 60 * 60))
            ;;
        *h)
            local hours=$(echo "$duration" | sed 's/h//')
            local retention_seconds=$((hours * 60 * 60))
            ;;
        *m)
            local minutes=$(echo "$duration" | sed 's/m//')
            local retention_seconds=$((minutes * 60))
            ;;
        *)
            log_error "Invalid duration format: $duration"
            exit 1
            ;;
    esac
    
    local retention_time=$((current_time - retention_seconds))
    echo "$retention_time"
}

# Archive old metrics
archive_old_metrics() {
    local metric_name="$1"
    local retention_time="$2"
    local archive_file="$3"
    
    log_info "Archiving old metrics for $metric_name before $retention_time"
    
    # Get metrics data
    local metrics_data=$(get_metrics "$metric_name" "0" "$retention_time")
    
    if [ -z "$metrics_data" ] || [ "$metrics_data" = "null" ]; then
        log_warn "No metrics data found for $metric_name"
        return 0
    fi
    
    # Create archive directory
    mkdir -p "$(dirname "$archive_file")"
    
    # Archive metrics data
    echo "$metrics_data" | gzip -c > "$archive_file"
    
    log_info "Metrics archived to $archive_file"
}

# Delete old metrics
delete_old_metrics() {
    local metric_name="$1"
    local retention_time="$2"
    
    log_info "Deleting old metrics for $metric_name before $retention_time"
    
    # This would depend on your Prometheus setup
    # For now, just log the action
    log_info "Would delete metrics for $metric_name before $retention_time"
}

# Compress archived metrics
compress_archived_metrics() {
    local archive_file="$1"
    
    if [ ! -f "$archive_file" ]; then
        log_warn "Archive file not found: $archive_file"
        return 0
    fi
    
    log_info "Compressing archived metrics: $archive_file"
    
    # Compress with gzip
    gzip -$COMPRESSION_LEVEL "$archive_file"
    
    log_info "Archive compressed: ${archive_file}.gz"
}

# Verify archive integrity
verify_archive_integrity() {
    local archive_file="$1"
    
    if [ ! -f "$archive_file" ]; then
        log_error "Archive file not found: $archive_file"
        return 1
    fi
    
    log_info "Verifying archive integrity: $archive_file"
    
    # Check if file is compressed
    if [[ "$archive_file" == *.gz ]]; then
        if gzip -t "$archive_file" 2>/dev/null; then
            log_info "Archive integrity verified"
            return 0
        else
            log_error "Archive integrity check failed"
            return 1
        fi
    else
        log_info "Archive is not compressed, skipping integrity check"
        return 0
    fi
}

# Clean up old archives
cleanup_old_archives() {
    local archive_dir="$1"
    local max_age_days="${2:-30}"
    
    log_info "Cleaning up old archives in $archive_dir (older than $max_age_days days)"
    
    if [ ! -d "$archive_dir" ]; then
        log_warn "Archive directory not found: $archive_dir"
        return 0
    fi
    
    # Find and delete old archives
    find "$archive_dir" -name "*.gz" -type f -mtime +$max_age_days -delete
    
    log_info "Old archives cleaned up"
}

# Generate retention report
generate_retention_report() {
    local report_file="$1"
    
    log_info "Generating retention report: $report_file"
    
    cat > "$report_file" << EOF
# Telemetry Retention Report

Generated on: $(date)

## Summary

### Retention Policy
- **High Resolution**: 7 days (1m intervals)
- **Medium Resolution**: 30 days (5m intervals)
- **Low Resolution**: 365 days (1h intervals)
- **Aggregated**: 1095 days (1d intervals)
- **Business Metrics**: 730 days (1h intervals)
- **Security Metrics**: 365 days (1m intervals)
- **Compliance Metrics**: 2555 days (1d intervals)
- **Cost Metrics**: 1095 days (1h intervals)
- **Performance Metrics**: 180 days (5m intervals)
- **UX Metrics**: 365 days (1h intervals)
- **Infrastructure Metrics**: 90 days (1m intervals)
- **Application Metrics**: 30 days (1m intervals)
- **Network Metrics**: 30 days (1m intervals)
- **Storage Metrics**: 30 days (1m intervals)
- **Custom Metrics**: 365 days (1h intervals)

## Archive Status

EOF

    # Add archive status
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "*.gz" -type f -exec ls -lh {} \; >> "$report_file"
    fi
    
    # Add recommendations
    cat >> "$report_file" << EOF

## Recommendations

1. **Immediate Actions**
   - Review retention policies for compliance
   - Verify archive integrity
   - Clean up old archives

2. **Medium-term Actions**
   - Implement automated retention management
   - Set up monitoring for retention processes
   - Regular backup verification

3. **Long-term Actions**
   - Review retention policies annually
   - Update policies based on business needs
   - Implement data lifecycle management

## Next Steps

1. Review retention policies
2. Verify archive integrity
3. Clean up old archives
4. Implement automated retention management
EOF

    log_info "Retention report generated: $report_file"
}

# Main function
main() {
    case "${1:-help}" in
        "archive")
            check_dependencies
            local policy=$(get_retention_policy)
            echo "$policy" | jq -r '.[] | select(.name == "high_resolution") | .metrics[]' | while read metric; do
                local retention_time=$(calculate_retention_period "7d")
                local archive_file="$BACKUP_DIR/$(date +%Y%m%d)/${metric}_$(date +%Y%m%d_%H%M%S).json"
                archive_old_metrics "$metric" "$retention_time" "$archive_file"
                compress_archived_metrics "$archive_file"
                verify_archive_integrity "${archive_file}.gz"
            done
            ;;
        "cleanup")
            check_dependencies
            cleanup_old_archives "$BACKUP_DIR" 30
            ;;
        "report")
            check_dependencies
            generate_retention_report "retention-report.md"
            ;;
        "help"|*)
            echo "Usage: $0 {archive|cleanup|report|help}"
            echo ""
            echo "Commands:"
            echo "  archive - Archive old metrics based on retention policy"
            echo "  cleanup - Clean up old archives"
            echo "  report  - Generate retention report"
            echo "  help    - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 archive"
            echo "  $0 cleanup"
            echo "  $0 report"
            ;;
    esac
}

# Run main function
main "$@"
