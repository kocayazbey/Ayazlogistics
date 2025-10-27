#!/bin/bash
# Dependency audit script for AyazLogistics

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

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install Node.js and npm."
        exit 1
    fi
}

# Check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install jq for JSON processing."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm ci
}

# Run security audit
run_security_audit() {
    log_info "Running security audit..."
    
    # Run npm audit
    npm audit --audit-level=moderate --json > audit-results.json
    
    # Check for high and critical vulnerabilities
    local high_vulns=$(npm audit --audit-level=high --json | jq '.vulnerabilities | length')
    local critical_vulns=$(npm audit --audit-level=critical --json | jq '.vulnerabilities | length')
    
    if [ "$high_vulns" -gt 0 ] || [ "$critical_vulns" -gt 0 ]; then
        log_error "High or critical vulnerabilities found!"
        npm audit --audit-level=high
        return 1
    fi
    
    log_info "Security audit passed"
    return 0
}

# Check license compliance
check_license_compliance() {
    log_info "Checking license compliance..."
    
    # Install license-checker if not present
    if ! command -v license-checker &> /dev/null; then
        log_info "Installing license-checker..."
        npm install -g license-checker
    fi
    
    # Allowed licenses
    local allowed_licenses="MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;Unlicense;CC0-1.0;LGPL-2.1;LGPL-3.0"
    
    # Check licenses
    license-checker --onlyAllow "$allowed_licenses" --excludePrivatePackages --json > license-report.json
    
    # Check for non-compliant licenses
    local non_compliant=$(jq 'to_entries | map(select(.value.licenses | test("'$allowed_licenses'") | not)) | length' license-report.json)
    
    if [ "$non_compliant" -gt 0 ]; then
        log_warn "Non-compliant licenses found:"
        jq 'to_entries | map(select(.value.licenses | test("'$allowed_licenses'") | not)) | .[] | {name: .key, license: .value.licenses}' license-report.json
        return 1
    fi
    
    log_info "License compliance check passed"
    return 0
}

# Check dependency pinning
check_dependency_pinning() {
    log_info "Checking dependency pinning..."
    
    # Check if package-lock.json exists
    if [ ! -f "package-lock.json" ]; then
        log_error "package-lock.json not found! Please commit it."
        return 1
    fi
    
    # Check for version ranges in package.json
    local version_ranges=$(grep -c "\"~" package.json || true)
    local caret_ranges=$(grep -c "\"^" package.json || true)
    
    if [ "$version_ranges" -gt 0 ] || [ "$caret_ranges" -gt 0 ]; then
        log_warn "Found version ranges in package.json:"
        grep -n "\"~" package.json || true
        grep -n "\"^" package.json || true
        log_warn "Consider pinning exact versions for better reproducibility."
        return 1
    fi
    
    log_info "Dependency pinning check passed"
    return 0
}

# Check for outdated dependencies
check_outdated_dependencies() {
    log_info "Checking for outdated dependencies..."
    
    # Check for outdated dependencies
    npm outdated --json > outdated-deps.json
    
    # Count outdated dependencies
    local outdated_count=$(jq 'length' outdated-deps.json)
    
    if [ "$outdated_count" -gt 0 ]; then
        log_warn "Found $outdated_count outdated dependencies:"
        jq -r 'to_entries[] | "\(.key): \(.value.current) -> \(.value.latest)"' outdated-deps.json
        return 1
    fi
    
    log_info "No outdated dependencies found"
    return 0
}

# Generate dependency report
generate_dependency_report() {
    log_info "Generating dependency report..."
    
    # Create reports directory
    mkdir -p reports
    
    # Generate comprehensive report
    cat > reports/dependency-report.md << EOF
# Dependency Audit Report

Generated on: $(date)

## Summary

- **Total Dependencies**: $(jq 'length' package.json)
- **Vulnerabilities**: $(jq '.vulnerabilities | length' audit-results.json)
- **Outdated Dependencies**: $(jq 'length' outdated-deps.json)
- **License Compliance**: $(jq 'to_entries | map(select(.value.licenses | test("MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;Unlicense;CC0-1.0;LGPL-2.1;LGPL-3.0") | not)) | length' license-report.json)

## Security Vulnerabilities

EOF

    # Add vulnerability details
    if [ -f "audit-results.json" ]; then
        jq -r '.vulnerabilities | to_entries[] | "### \(.key)\n- **Severity**: \(.value.severity)\n- **Description**: \(.value.description)\n- **Path**: \(.value.path)\n- **Fix**: \(.value.fix)\n"' audit-results.json >> reports/dependency-report.md
    fi
    
    # Add outdated dependencies
    cat >> reports/dependency-report.md << EOF

## Outdated Dependencies

EOF

    if [ -f "outdated-deps.json" ]; then
        jq -r 'to_entries[] | "- **\(.key)**: \(.value.current) -> \(.value.latest)"' outdated-deps.json >> reports/dependency-report.md
    fi
    
    # Add license information
    cat >> reports/dependency-report.md << EOF

## License Information

EOF

    if [ -f "license-report.json" ]; then
        jq -r 'to_entries[] | "- **\(.key)**: \(.value.licenses)"' license-report.json >> reports/dependency-report.md
    fi
    
    log_info "Dependency report generated: reports/dependency-report.md"
}

# Update dependencies
update_dependencies() {
    log_info "Updating dependencies..."
    
    # Update package.json
    npm update
    
    # Check for security updates
    npm audit fix
    
    # Generate new package-lock.json
    npm install
    
    log_info "Dependencies updated"
}

# Fix security vulnerabilities
fix_vulnerabilities() {
    log_info "Fixing security vulnerabilities..."
    
    # Run npm audit fix
    npm audit fix
    
    # Check if vulnerabilities still exist
    local remaining_vulns=$(npm audit --audit-level=high --json | jq '.vulnerabilities | length')
    
    if [ "$remaining_vulns" -gt 0 ]; then
        log_warn "Some vulnerabilities could not be automatically fixed"
        npm audit --audit-level=high
        return 1
    fi
    
    log_info "Security vulnerabilities fixed"
    return 0
}

# Main function
main() {
    case "${1:-help}" in
        "audit")
            check_npm
            check_jq
            install_dependencies
            run_security_audit
            check_license_compliance
            check_dependency_pinning
            check_outdated_dependencies
            generate_dependency_report
            ;;
        "update")
            check_npm
            update_dependencies
            ;;
        "fix")
            check_npm
            fix_vulnerabilities
            ;;
        "report")
            check_jq
            generate_dependency_report
            ;;
        "help"|*)
            echo "Usage: $0 {audit|update|fix|report|help}"
            echo ""
            echo "Commands:"
            echo "  audit   - Run comprehensive dependency audit"
            echo "  update  - Update all dependencies"
            echo "  fix     - Fix security vulnerabilities"
            echo "  report  - Generate dependency report"
            echo "  help    - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 audit"
            echo "  $0 update"
            echo "  $0 fix"
            echo "  $0 report"
            ;;
    esac
}

# Run main function
main "$@"
