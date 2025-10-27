#!/bin/bash

# SBOM Generation Script for AyazLogistics
# Generates Software Bill of Materials for all components

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/sbom-output"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create output directory
mkdir -p "${OUTPUT_DIR}"

echo -e "${BLUE}🔍 AyazLogistics SBOM Generation${NC}"
echo -e "${BLUE}================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install required tools if not present
install_tools() {
    echo -e "${YELLOW}📦 Checking required tools...${NC}"
    
    if ! command_exists syft; then
        echo -e "${YELLOW}Installing Syft...${NC}"
        curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
    fi
    
    if ! command_exists trivy; then
        echo -e "${YELLOW}Installing Trivy...${NC}"
        curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    fi
    
    if ! command_exists cosign; then
        echo -e "${YELLOW}Installing Cosign...${NC}"
        curl -O -L "https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64"
        chmod +x cosign-linux-amd64
        sudo mv cosign-linux-amd64 /usr/local/bin/cosign
    fi
}

# Generate SBOM for Node.js projects
generate_nodejs_sbom() {
    local project_path="$1"
    local project_name="$2"
    
    echo -e "${BLUE}📋 Generating SBOM for ${project_name}...${NC}"
    
    cd "${project_path}"
    
    # Generate package-lock.json if it doesn't exist
    if [ ! -f "package-lock.json" ]; then
        echo -e "${YELLOW}Generating package-lock.json for ${project_name}...${NC}"
        npm install --package-lock-only
    fi
    
    # Generate SBOM using Syft
    syft packages . \
        --output spdx-json \
        --file "${OUTPUT_DIR}/${project_name}-${TIMESTAMP}.spdx.json" \
        --quiet
    
    # Generate vulnerability report
    trivy fs . \
        --format spdx-json \
        --output "${OUTPUT_DIR}/${project_name}-vulnerabilities-${TIMESTAMP}.spdx.json" \
        --quiet
    
    echo -e "${GREEN}✅ SBOM generated for ${project_name}${NC}"
}

# Generate SBOM for Docker images
generate_docker_sbom() {
    local image_name="$1"
    local image_tag="$2"
    
    echo -e "${BLUE}🐳 Generating SBOM for Docker image ${image_name}:${image_tag}...${NC}"
    
    # Generate SBOM for Docker image
    syft docker:"${image_name}:${image_tag}" \
        --output spdx-json \
        --file "${OUTPUT_DIR}/docker-${image_name}-${TIMESTAMP}.spdx.json" \
        --quiet
    
    # Generate vulnerability report for Docker image
    trivy image "${image_name}:${image_tag}" \
        --format spdx-json \
        --output "${OUTPUT_DIR}/docker-${image_name}-vulnerabilities-${TIMESTAMP}.spdx.json" \
        --quiet
    
    echo -e "${GREEN}✅ SBOM generated for Docker image ${image_name}:${image_tag}${NC}"
}

# Generate comprehensive project SBOM
generate_project_sbom() {
    echo -e "${BLUE}📊 Generating comprehensive project SBOM...${NC}"
    
    # Backend API
    if [ -d "${PROJECT_ROOT}/src" ]; then
        generate_nodejs_sbom "${PROJECT_ROOT}" "backend-api"
    fi
    
    # Frontend Admin Panel
    if [ -d "${PROJECT_ROOT}/frontend/admin-panel" ]; then
        generate_nodejs_sbom "${PROJECT_ROOT}/frontend/admin-panel" "frontend-admin-panel"
    fi
    
    # Frontend Customer Portal
    if [ -d "${PROJECT_ROOT}/frontend/customer-portal" ]; then
        generate_nodejs_sbom "${PROJECT_ROOT}/frontend/customer-portal" "frontend-customer-portal"
    fi
    
    # Mobile App
    if [ -d "${PROJECT_ROOT}/frontend/mobile-app" ]; then
        generate_nodejs_sbom "${PROJECT_ROOT}/frontend/mobile-app" "mobile-app"
    fi
    
    # Generate Docker image SBOMs if images exist
    if command_exists docker; then
        echo -e "${BLUE}🐳 Checking for Docker images...${NC}"
        
        # Build images if they don't exist
        if ! docker image inspect ayazlogistics:latest >/dev/null 2>&1; then
            echo -e "${YELLOW}Building Docker image...${NC}"
            docker build -f Dockerfile.optimized -t ayazlogistics:latest .
        fi
        
        generate_docker_sbom "ayazlogistics" "latest"
    fi
}

# Generate summary report
generate_summary() {
    echo -e "${BLUE}📈 Generating SBOM summary...${NC}"
    
    local summary_file="${OUTPUT_DIR}/sbom-summary-${TIMESTAMP}.md"
    
    cat > "${summary_file}" << EOF
# AyazLogistics SBOM Summary

**Generated:** $(date)
**Project:** AyazLogistics Logistics Management System
**Version:** $(git describe --tags --always 2>/dev/null || echo "unknown")

## Generated SBOMs

EOF

    # List all generated files
    find "${OUTPUT_DIR}" -name "*.spdx.json" -type f | while read -r file; do
        local filename=$(basename "$file")
        local size=$(du -h "$file" | cut -f1)
        echo "- **${filename}** (${size})" >> "${summary_file}"
    done
    
    cat >> "${summary_file}" << EOF

## Security Information

This SBOM includes:
- Software component inventory
- Dependency relationships
- Vulnerability information
- License information

## Usage

To verify SBOM integrity:
\`\`\`bash
# Verify SPDX format
syft attest verify --key cosign.pub sbom.spdx.json

# Check for vulnerabilities
trivy sbom sbom.spdx.json
\`\`\`

## Compliance

This SBOM is generated in compliance with:
- SPDX 2.3 specification
- NTIA Software Component Transparency
- OWASP Software Supply Chain Security

EOF

    echo -e "${GREEN}✅ Summary generated: ${summary_file}${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting SBOM generation process...${NC}"
    
    # Install required tools
    install_tools
    
    # Generate SBOMs
    generate_project_sbom
    
    # Generate summary
    generate_summary
    
    echo -e "${GREEN}🎉 SBOM generation completed successfully!${NC}"
    echo -e "${BLUE}📁 Output directory: ${OUTPUT_DIR}${NC}"
    echo -e "${BLUE}📊 Total files generated: $(find "${OUTPUT_DIR}" -name "*.spdx.json" | wc -l)${NC}"
}

# Run main function
main "$@"
