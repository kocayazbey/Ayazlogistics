#!/bin/bash
# Security scan script for AyazLogistics

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

# Check if required tools are installed
check_dependencies() {
    log_info "Checking security scan dependencies..."
    
    # Check for Trivy
    if ! command -v trivy &> /dev/null; then
        log_error "Trivy is not installed"
        log_info "Install: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin"
        exit 1
    fi
    
    # Check for Checkov
    if ! command -v checkov &> /dev/null; then
        log_error "Checkov is not installed"
        log_info "Install: pip install checkov"
        exit 1
    fi
    
    # Check for Semgrep
    if ! command -v semgrep &> /dev/null; then
        log_error "Semgrep is not installed"
        log_info "Install: pip install semgrep"
        exit 1
    fi
    
    # Check for Snyk
    if ! command -v snyk &> /dev/null; then
        log_error "Snyk is not installed"
        log_info "Install: npm install -g snyk"
        exit 1
    fi
    
    log_info "All security scan dependencies are installed"
}

# Run Trivy vulnerability scan
run_trivy_scan() {
    log_info "Running Trivy vulnerability scan..."
    
    # Create reports directory
    mkdir -p reports/security
    
    # Scan filesystem
    trivy fs . --format json --output reports/security/trivy-fs-results.json
    trivy fs . --format table --output reports/security/trivy-fs-results.txt
    
    # Scan container images
    if docker images | grep -q "ayazlogistics/backend"; then
        trivy image ayazlogistics/backend:latest --format json --output reports/security/trivy-container-results.json
        trivy image ayazlogistics/backend:latest --format table --output reports/security/trivy-container-results.txt
    else
        log_warn "Container image not found, skipping container scan"
    fi
    
    log_info "Trivy scan completed"
}

# Run Checkov IaC scan
run_checkov_scan() {
    log_info "Running Checkov IaC scan..."
    
    # Scan Kubernetes manifests
    if [ -d "k8s" ]; then
        checkov -d k8s/ --framework kubernetes --format json --output reports/security/checkov-k8s-results.json
        checkov -d k8s/ --framework kubernetes --format table --output reports/security/checkov-k8s-results.txt
    fi
    
    # Scan Dockerfiles
    if [ -f "Dockerfile" ]; then
        checkov -f Dockerfile --framework dockerfile --format json --output reports/security/checkov-docker-results.json
        checkov -f Dockerfile --framework dockerfile --format table --output reports/security/checkov-docker-results.txt
    fi
    
    # Scan Terraform (if exists)
    if [ -d "terraform" ]; then
        checkov -d terraform/ --framework terraform --format json --output reports/security/checkov-terraform-results.json
        checkov -d terraform/ --framework terraform --format table --output reports/security/checkov-terraform-results.txt
    fi
    
    log_info "Checkov scan completed"
}

# Run Semgrep SAST scan
run_semgrep_scan() {
    log_info "Running Semgrep SAST scan..."
    
    # Run security audit rules
    semgrep --config=auto --config=p/security-audit --config=p/secrets --config=p/owasp-top-ten --json --output=reports/security/semgrep-results.json .
    semgrep --config=auto --config=p/security-audit --config=p/secrets --config=p/owasp-top-ten --output=reports/security/semgrep-results.txt .
    
    log_info "Semgrep scan completed"
}

# Run Snyk security scan
run_snyk_scan() {
    log_info "Running Snyk security scan..."
    
    # Check if Snyk is authenticated
    if ! snyk auth --help &> /dev/null; then
        log_warn "Snyk not authenticated, skipping Snyk scan"
        return 0
    fi
    
    # Run Snyk scan
    snyk test --json --output-file=reports/security/snyk-results.json || true
    snyk test --output-file=reports/security/snyk-results.txt || true
    
    log_info "Snyk scan completed"
}

# Run OWASP ZAP scan
run_zap_scan() {
    log_info "Running OWASP ZAP scan..."
    
    # Check if application is running
    if ! curl -s http://localhost:3000/health &> /dev/null; then
        log_warn "Application not running, skipping ZAP scan"
        return 0
    fi
    
    # Run ZAP baseline scan
    docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000 -J reports/security/zap-results.json -r reports/security/zap-results.html || true
    
    log_info "ZAP scan completed"
}

# Generate security report
generate_security_report() {
    log_info "Generating security report..."
    
    # Create comprehensive security report
    cat > reports/security/security-report.md << EOF
# Security Scan Report

Generated on: $(date)

## Summary

### Scan Results
- **Trivy FS**: $(jq '.Results | length' reports/security/trivy-fs-results.json 2>/dev/null || echo "N/A")
- **Trivy Container**: $(jq '.Results | length' reports/security/trivy-container-results.json 2>/dev/null || echo "N/A")
- **Checkov K8s**: $(jq '.results | length' reports/security/checkov-k8s-results.json 2>/dev/null || echo "N/A")
- **Checkov Docker**: $(jq '.results | length' reports/security/checkov-docker-results.json 2>/dev/null || echo "N/A")
- **Semgrep**: $(jq '.results | length' reports/security/semgrep-results.json 2>/dev/null || echo "N/A")
- **Snyk**: $(jq '.vulnerabilities | length' reports/security/snyk-results.json 2>/dev/null || echo "N/A")

## Vulnerability Details

EOF

    # Add Trivy results
    if [ -f "reports/security/trivy-fs-results.json" ]; then
        cat >> reports/security/security-report.md << EOF

### Trivy Filesystem Scan

EOF
        jq -r '.Results[] | select(.Vulnerabilities) | .Vulnerabilities[] | "- **\(.VulnerabilityID)**: \(.Severity) - \(.Title)"' reports/security/trivy-fs-results.json >> reports/security/security-report.md
    fi
    
    # Add Checkov results
    if [ -f "reports/security/checkov-k8s-results.json" ]; then
        cat >> reports/security/security-report.md << EOF

### Checkov Kubernetes Scan

EOF
        jq -r '.results[] | "- **\(.check_id)**: \(.check_name) - \(.check_result)"' reports/security/checkov-k8s-results.json >> reports/security/security-report.md
    fi
    
    # Add Semgrep results
    if [ -f "reports/security/semgrep-results.json" ]; then
        cat >> reports/security/security-report.md << EOF

### Semgrep SAST Scan

EOF
        jq -r '.results[] | "- **\(.check_id)**: \(.message) - \(.severity)"' reports/security/semgrep-results.json >> reports/security/security-report.md
    fi
    
    # Add Snyk results
    if [ -f "reports/security/snyk-results.json" ]; then
        cat >> reports/security/security-report.md << EOF

### Snyk Scan

EOF
        jq -r '.vulnerabilities[] | "- **\(.id)**: \(.severity) - \(.title)"' reports/security/snyk-results.json >> reports/security/security-report.md
    fi
    
    # Add recommendations
    cat >> reports/security/security-report.md << EOF

## Recommendations

1. **Immediate Actions**
   - Fix critical and high severity vulnerabilities
   - Update dependencies with security patches
   - Implement security best practices

2. **Medium-term Actions**
   - Regular security scanning in CI/CD
   - Implement security policies
   - Security training for development team

3. **Long-term Actions**
   - Security by design principles
   - Threat modeling
   - Security architecture review

## Next Steps

1. Review and prioritize vulnerabilities
2. Create security tickets for fixes
3. Implement security controls
4. Regular security assessments
EOF

    log_info "Security report generated: reports/security/security-report.md"
}

# Fix security issues
fix_security_issues() {
    log_info "Attempting to fix security issues..."
    
    # Update dependencies
    npm audit fix
    
    # Update container base images
    if [ -f "Dockerfile" ]; then
        log_info "Consider updating base images in Dockerfile"
    fi
    
    # Update Kubernetes manifests
    if [ -d "k8s" ]; then
        log_info "Review Kubernetes security contexts"
    fi
    
    log_info "Security fixes applied"
}

# Main function
main() {
    case "${1:-help}" in
        "scan")
            check_dependencies
            run_trivy_scan
            run_checkov_scan
            run_semgrep_scan
            run_snyk_scan
            run_zap_scan
            generate_security_report
            ;;
        "fix")
            fix_security_issues
            ;;
        "report")
            generate_security_report
            ;;
        "help"|*)
            echo "Usage: $0 {scan|fix|report|help}"
            echo ""
            echo "Commands:"
            echo "  scan   - Run comprehensive security scan"
            echo "  fix    - Attempt to fix security issues"
            echo "  report - Generate security report"
            echo "  help   - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 scan"
            echo "  $0 fix"
            echo "  $0 report"
            ;;
    esac
}

# Run main function
main "$@"
