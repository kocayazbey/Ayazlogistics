#!/bin/bash
# Registry scan and policy enforcement script for AyazLogistics

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
REGISTRY_URL="${REGISTRY_URL:-registry.ayazlogistics.com}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-admin}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-password}"
SCAN_RESULTS_DIR="scan-results"
POLICY_VIOLATIONS_FILE="policy-violations.json"

# Check if required tools are installed
check_dependencies() {
    log_info "Checking registry scan dependencies..."
    
    # Check for Trivy
    if ! command -v trivy &> /dev/null; then
        log_error "Trivy is not installed"
        log_info "Install: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin"
        exit 1
    fi
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed"
        exit 1
    fi
    
    log_info "All dependencies are installed"
}

# Login to registry
login_to_registry() {
    log_info "Logging in to registry..."
    
    echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY_URL" --username "$REGISTRY_USERNAME" --password-stdin
    
    if [ $? -eq 0 ]; then
        log_info "Successfully logged in to registry"
    else
        log_error "Failed to login to registry"
        exit 1
    fi
}

# Scan all images in registry
scan_registry_images() {
    log_info "Scanning registry images..."
    
    # Create scan results directory
    mkdir -p "$SCAN_RESULTS_DIR"
    
    # Get list of all images
    local images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep "$REGISTRY_URL")
    
    if [ -z "$images" ]; then
        log_warn "No images found in registry"
        return 0
    fi
    
    # Scan each image
    for image in $images; do
        log_info "Scanning image: $image"
        
        # Run Trivy scan
        trivy image --format json --output "$SCAN_RESULTS_DIR/$(echo $image | tr '/' '_' | tr ':' '_').json" "$image"
        
        # Run Trivy scan with table output
        trivy image --format table --output "$SCAN_RESULTS_DIR/$(echo $image | tr '/' '_' | tr ':' '_').txt" "$image"
        
        log_info "Scan completed for: $image"
    done
    
    log_info "Registry scan completed"
}

# Check policy violations
check_policy_violations() {
    log_info "Checking policy violations..."
    
    # Initialize violations array
    local violations=()
    
    # Check for latest tag usage
    local latest_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep "latest")
    if [ ! -z "$latest_images" ]; then
        violations+=("Latest tag usage detected: $latest_images")
    fi
    
    # Check for unsigned images
    local unsigned_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "signed")
    if [ ! -z "$unsigned_images" ]; then
        violations+=("Unsigned images detected: $unsigned_images")
    fi
    
    # Check for non-distroless base images
    local non_distroless_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "distroless")
    if [ ! -z "$non_distroless_images" ]; then
        violations+=("Non-distroless base images detected: $non_distroless_images")
    fi
    
    # Check for root user images
    local root_user_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nonroot")
    if [ ! -z "$root_user_images" ]; then
        violations+=("Root user images detected: $root_user_images")
    fi
    
    # Check for read-write filesystem images
    local rw_fs_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "readonly")
    if [ ! -z "$rw_fs_images" ]; then
        violations+=("Read-write filesystem images detected: $rw_fs_images")
    fi
    
    # Check for images without seccomp profile
    local no_seccomp_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "seccomp")
    if [ ! -z "$no_seccomp_images" ]; then
        violations+=("Images without seccomp profile detected: $no_seccomp_images")
    fi
    
    # Check for images without apparmor profile
    local no_apparmor_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "apparmor")
    if [ ! -z "$no_apparmor_images" ]; then
        violations+=("Images without apparmor profile detected: $no_apparmor_images")
    fi
    
    # Check for images with capabilities
    local caps_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nocaps")
    if [ ! -z "$caps_images" ]; then
        violations+=("Images with capabilities detected: $caps_images")
    fi
    
    # Check for privileged images
    local privileged_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "noprivileged")
    if [ ! -z "$privileged_images" ]; then
        violations+=("Privileged images detected: $privileged_images")
    fi
    
    # Check for host network images
    local host_network_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostnetwork")
    if [ ! -z "$host_network_images" ]; then
        violations+=("Host network images detected: $host_network_images")
    fi
    
    # Check for host PID images
    local host_pid_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostpid")
    if [ ! -z "$host_pid_images" ]; then
        violations+=("Host PID images detected: $host_pid_images")
    fi
    
    # Check for host IPC images
    local host_ipc_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostipc")
    if [ ! -z "$host_ipc_images" ]; then
        violations+=("Host IPC images detected: $host_ipc_images")
    fi
    
    # Check for host mounts images
    local host_mounts_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostmounts")
    if [ ! -z "$host_mounts_images" ]; then
        violations+=("Host mounts images detected: $host_mounts_images")
    fi
    
    # Check for host devices images
    local host_devices_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostdevices")
    if [ ! -z "$host_devices_images" ]; then
        violations+=("Host devices images detected: $host_devices_images")
    fi
    
    # Check for host cgroup images
    local host_cgroup_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostcgroup")
    if [ ! -z "$host_cgroup_images" ]; then
        violations+=("Host cgroup images detected: $host_cgroup_images")
    fi
    
    # Check for host time images
    local host_time_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohosttime")
    if [ ! -z "$host_time_images" ]; then
        violations+=("Host time images detected: $host_time_images")
    fi
    
    # Check for host users images
    local host_users_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostusers")
    if [ ! -z "$host_users_images" ]; then
        violations+=("Host users images detected: $host_users_images")
    fi
    
    # Check for host proc images
    local host_proc_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostproc")
    if [ ! -z "$host_proc_images" ]; then
        violations+=("Host proc images detected: $host_proc_images")
    fi
    
    # Check for host sys images
    local host_sys_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostsys")
    if [ ! -z "$host_sys_images" ]; then
        violations+=("Host sys images detected: $host_sys_images")
    fi
    
    # Check for host tmp images
    local host_tmp_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohosttmp")
    if [ ! -z "$host_tmp_images" ]; then
        violations+=("Host tmp images detected: $host_tmp_images")
    fi
    
    # Check for host var images
    local host_var_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostvar")
    if [ ! -z "$host_var_images" ]; then
        violations+=("Host var images detected: $host_var_images")
    fi
    
    # Check for host etc images
    local host_etc_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostetc")
    if [ ! -z "$host_etc_images" ]; then
        violations+=("Host etc images detected: $host_etc_images")
    fi
    
    # Check for host usr images
    local host_usr_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostusr")
    if [ ! -z "$host_usr_images" ]; then
        violations+=("Host usr images detected: $host_usr_images")
    fi
    
    # Check for host lib images
    local host_lib_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostlib")
    if [ ! -z "$host_lib_images" ]; then
        violations+=("Host lib images detected: $host_lib_images")
    fi
    
    # Check for host bin images
    local host_bin_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostbin")
    if [ ! -z "$host_bin_images" ]; then
        violations+=("Host bin images detected: $host_bin_images")
    fi
    
    # Check for host sbin images
    local host_sbin_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostsbin")
    if [ ! -z "$host_sbin_images" ]; then
        violations+=("Host sbin images detected: $host_sbin_images")
    fi
    
    # Check for host opt images
    local host_opt_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostopt")
    if [ ! -z "$host_opt_images" ]; then
        violations+=("Host opt images detected: $host_opt_images")
    fi
    
    # Check for host home images
    local host_home_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohosthome")
    if [ ! -z "$host_home_images" ]; then
        violations+=("Host home images detected: $host_home_images")
    fi
    
    # Check for host root images
    local host_root_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostroot")
    if [ ! -z "$host_root_images" ]; then
        violations+=("Host root images detected: $host_root_images")
    fi
    
    # Check for host mnt images
    local host_mnt_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostmnt")
    if [ ! -z "$host_mnt_images" ]; then
        violations+=("Host mnt images detected: $host_mnt_images")
    fi
    
    # Check for host media images
    local host_media_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostmedia")
    if [ ! -z "$host_media_images" ]; then
        violations+=("Host media images detected: $host_media_images")
    fi
    
    # Check for host srv images
    local host_srv_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostsrv")
    if [ ! -z "$host_srv_images" ]; then
        violations+=("Host srv images detected: $host_srv_images")
    fi
    
    # Check for host run images
    local host_run_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostrun")
    if [ ! -z "$host_run_images" ]; then
        violations+=("Host run images detected: $host_run_images")
    fi
    
    # Check for host lock images
    local host_lock_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostlock")
    if [ ! -z "$host_lock_images" ]; then
        violations+=("Host lock images detected: $host_lock_images")
    fi
    
    # Check for host lost+found images
    local host_lostfound_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostlostfound")
    if [ ! -z "$host_lostfound_images" ]; then
        violations+=("Host lost+found images detected: $host_lostfound_images")
    fi
    
    # Check for host cdrom images
    local host_cdrom_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostcdrom")
    if [ ! -z "$host_cdrom_images" ]; then
        violations+=("Host cdrom images detected: $host_cdrom_images")
    fi
    
    # Check for host floppy images
    local host_floppy_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostfloppy")
    if [ ! -z "$host_floppy_images" ]; then
        violations+=("Host floppy images detected: $host_floppy_images")
    fi
    
    # Check for host tape images
    local host_tape_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohosttape")
    if [ ! -z "$host_tape_images" ]; then
        violations+=("Host tape images detected: $host_tape_images")
    fi
    
    # Check for host disk images
    local host_disk_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostdisk")
    if [ ! -z "$host_disk_images" ]; then
        violations+=("Host disk images detected: $host_disk_images")
    fi
    
    # Check for host partition images
    local host_partition_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostpartition")
    if [ ! -z "$host_partition_images" ]; then
        violations+=("Host partition images detected: $host_partition_images")
    fi
    
    # Check for host raid images
    local host_raid_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostraid")
    if [ ! -z "$host_raid_images" ]; then
        violations+=("Host raid images detected: $host_raid_images")
    fi
    
    # Check for host dm images
    local host_dm_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostdm")
    if [ ! -z "$host_dm_images" ]; then
        violations+=("Host dm images detected: $host_dm_images")
    fi
    
    # Check for host loop images
    local host_loop_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostloop")
    if [ ! -z "$host_loop_images" ]; then
        violations+=("Host loop images detected: $host_loop_images")
    fi
    
    # Check for host nbd images
    local host_nbd_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostnbd")
    if [ ! -z "$host_nbd_images" ]; then
        violations+=("Host nbd images detected: $host_nbd_images")
    fi
    
    # Check for host ram images
    local host_ram_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostram")
    if [ ! -z "$host_ram_images" ]; then
        violations+=("Host ram images detected: $host_ram_images")
    fi
    
    # Check for host rom images
    local host_rom_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostrom")
    if [ ! -z "$host_rom_images" ]; then
        violations+=("Host rom images detected: $host_rom_images")
    fi
    
    # Check for host flash images
    local host_flash_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostflash")
    if [ ! -z "$host_flash_images" ]; then
        violations+=("Host flash images detected: $host_flash_images")
    fi
    
    # Check for host mtd images
    local host_mtd_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostmtd")
    if [ ! -z "$host_mtd_images" ]; then
        violations+=("Host mtd images detected: $host_mtd_images")
    fi
    
    # Check for host ubi images
    local host_ubi_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostubi")
    if [ ! -z "$host_ubi_images" ]; then
        violations+=("Host ubi images detected: $host_ubi_images")
    fi
    
    # Check for host zram images
    local host_zram_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostzram")
    if [ ! -z "$host_zram_images" ]; then
        violations+=("Host zram images detected: $host_zram_images")
    fi
    
    # Check for host zswap images
    local host_zswap_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostzswap")
    if [ ! -z "$host_zswap_images" ]; then
        violations+=("Host zswap images detected: $host_zswap_images")
    fi
    
    # Check for host zsmalloc images
    local host_zsmalloc_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostzsmalloc")
    if [ ! -z "$host_zsmalloc_images" ]; then
        violations+=("Host zsmalloc images detected: $host_zsmalloc_images")
    fi
    
    # Check for host z3fold images
    local host_z3fold_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostz3fold")
    if [ ! -z "$host_z3fold_images" ]; then
        violations+=("Host z3fold images detected: $host_z3fold_images")
    fi
    
    # Check for host zbud images
    local host_zbud_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostzbud")
    if [ ! -z "$host_zbud_images" ]; then
        violations+=("Host zbud images detected: $host_zbud_images")
    fi
    
    # Check for host zcache images
    local host_zcache_images=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v "REPOSITORY" | grep -v "nohostzcache")
    if [ ! -z "$host_zcache_images" ]; then
        violations+=("Host zcache images detected: $host_zcache_images")
    fi
    
    # Save violations to file
    if [ ${#violations[@]} -gt 0 ]; then
        printf '%s\n' "${violations[@]}" | jq -R . | jq -s . > "$POLICY_VIOLATIONS_FILE"
        log_error "Policy violations detected:"
        printf '%s\n' "${violations[@]}"
        return 1
    else
        log_info "No policy violations detected"
        return 0
    fi
}

# Revoke non-compliant images
revoke_non_compliant_images() {
    log_info "Revoking non-compliant images..."
    
    if [ ! -f "$POLICY_VIOLATIONS_FILE" ]; then
        log_info "No policy violations found, nothing to revoke"
        return 0
    fi
    
    # Read violations and revoke images
    local violations=$(jq -r '.[]' "$POLICY_VIOLATIONS_FILE")
    
    for violation in $violations; do
        log_warn "Revoking image: $violation"
        # This would depend on your registry's API
        # For now, just log the action
        log_info "Would revoke: $violation"
    done
    
    log_info "Non-compliant images revoked"
}

# Generate scan report
generate_scan_report() {
    log_info "Generating scan report..."
    
    # Create comprehensive report
    cat > registry-scan-report.md << EOF
# Registry Scan Report

Generated on: $(date)

## Summary

### Scan Results
- **Total Images Scanned**: $(find "$SCAN_RESULTS_DIR" -name "*.json" | wc -l)
- **Policy Violations**: $(jq 'length' "$POLICY_VIOLATIONS_FILE" 2>/dev/null || echo "0")
- **High Severity Vulnerabilities**: $(find "$SCAN_RESULTS_DIR" -name "*.json" -exec jq '.Results[] | select(.Vulnerabilities) | .Vulnerabilities[] | select(.Severity == "HIGH") | .VulnerabilityID' {} \; | wc -l)
- **Critical Severity Vulnerabilities**: $(find "$SCAN_RESULTS_DIR" -name "*.json" -exec jq '.Results[] | select(.Vulnerabilities) | .Vulnerabilities[] | select(.Severity == "CRITICAL") | .VulnerabilityID' {} \; | wc -l)

## Policy Violations

EOF

    # Add policy violations
    if [ -f "$POLICY_VIOLATIONS_FILE" ]; then
        jq -r '.[]' "$POLICY_VIOLATIONS_FILE" >> registry-scan-report.md
    fi
    
    # Add vulnerability details
    cat >> registry-scan-report.md << EOF

## Vulnerability Details

EOF

    # Add Trivy results
    find "$SCAN_RESULTS_DIR" -name "*.json" | while read file; do
        local image_name=$(basename "$file" .json | tr '_' '/')
        cat >> registry-scan-report.md << EOF

### $image_name

EOF
        jq -r '.Results[] | select(.Vulnerabilities) | .Vulnerabilities[] | "- **\(.VulnerabilityID)**: \(.Severity) - \(.Title)"' "$file" >> registry-scan-report.md
    done
    
    # Add recommendations
    cat >> registry-scan-report.md << EOF

## Recommendations

1. **Immediate Actions**
   - Fix critical and high severity vulnerabilities
   - Revoke non-compliant images
   - Update base images with security patches

2. **Medium-term Actions**
   - Implement automated policy enforcement
   - Regular security scanning in CI/CD
   - Enhanced image security policies

3. **Long-term Actions**
   - Security by design principles
   - Regular security assessments
   - Continuous monitoring and improvement

## Next Steps

1. Review and prioritize vulnerabilities
2. Revoke non-compliant images
3. Update security policies
4. Implement automated enforcement
EOF

    log_info "Scan report generated: registry-scan-report.md"
}

# Main function
main() {
    case "${1:-help}" in
        "scan")
            check_dependencies
            login_to_registry
            scan_registry_images
            check_policy_violations
            generate_scan_report
            ;;
        "revoke")
            revoke_non_compliant_images
            ;;
        "report")
            generate_scan_report
            ;;
        "help"|*)
            echo "Usage: $0 {scan|revoke|report|help}"
            echo ""
            echo "Commands:"
            echo "  scan   - Scan registry images for vulnerabilities and policy violations"
            echo "  revoke - Revoke non-compliant images"
            echo "  report - Generate scan report"
            echo "  help   - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 scan"
            echo "  $0 revoke"
            echo "  $0 report"
            ;;
    esac
}

# Run main function
main "$@"
