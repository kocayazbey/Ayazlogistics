#!/bin/bash

# Cosign Setup and Container Signing Script for AyazLogistics
# Sets up Cosign for container image signing and verification

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COSIGN_DIR="${PROJECT_ROOT}/.cosign"
KEYS_DIR="${COSIGN_DIR}/keys"

echo -e "${BLUE}🔐 AyazLogistics Cosign Setup${NC}"
echo -e "${BLUE}=============================${NC}"

# Create directories
mkdir -p "${COSIGN_DIR}"
mkdir -p "${KEYS_DIR}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Cosign
install_cosign() {
    echo -e "${YELLOW}📦 Installing Cosign...${NC}"
    
    if command_exists cosign; then
        echo -e "${GREEN}✅ Cosign already installed${NC}"
        cosign version
        return
    fi
    
    # Detect OS and architecture
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        arm64) ARCH="arm64" ;;
        aarch64) ARCH="arm64" ;;
    esac
    
    # Download and install Cosign
    COSIGN_VERSION="v2.2.4"
    DOWNLOAD_URL="https://github.com/sigstore/cosign/releases/download/${COSIGN_VERSION}/cosign-${OS}-${ARCH}"
    
    echo -e "${BLUE}Downloading Cosign ${COSIGN_VERSION}...${NC}"
    curl -L "${DOWNLOAD_URL}" -o cosign
    chmod +x cosign
    
    if [[ "$OS" == "darwin" ]]; then
        sudo mv cosign /usr/local/bin/
    else
        sudo mv cosign /usr/local/bin/
    fi
    
    echo -e "${GREEN}✅ Cosign installed successfully${NC}"
    cosign version
}

# Generate Cosign key pair
generate_keys() {
    echo -e "${YELLOW}🔑 Generating Cosign key pair...${NC}"
    
    if [ -f "${KEYS_DIR}/cosign.key" ] && [ -f "${KEYS_DIR}/cosign.pub" ]; then
        echo -e "${GREEN}✅ Cosign keys already exist${NC}"
        return
    fi
    
    # Generate key pair
    cosign generate-key-pair --output-key-prefix "${KEYS_DIR}/cosign"
    
    # Set proper permissions
    chmod 600 "${KEYS_DIR}/cosign.key"
    chmod 644 "${KEYS_DIR}/cosign.pub"
    
    echo -e "${GREEN}✅ Cosign key pair generated${NC}"
    echo -e "${BLUE}Private key: ${KEYS_DIR}/cosign.key${NC}"
    echo -e "${BLUE}Public key: ${KEYS_DIR}/cosign.pub${NC}"
}

# Sign container image
sign_image() {
    local image_name="$1"
    local image_tag="$2"
    local full_image="${image_name}:${image_tag}"
    
    echo -e "${BLUE}✍️  Signing container image: ${full_image}${NC}"
    
    # Check if image exists locally
    if ! docker image inspect "${full_image}" >/dev/null 2>&1; then
        echo -e "${RED}❌ Image ${full_image} not found locally${NC}"
        echo -e "${YELLOW}Building image first...${NC}"
        docker build -f Dockerfile.optimized -t "${full_image}" .
    fi
    
    # Sign the image
    cosign sign --key "${KEYS_DIR}/cosign.key" "${full_image}"
    
    echo -e "${GREEN}✅ Image signed successfully${NC}"
}

# Verify container image
verify_image() {
    local image_name="$1"
    local image_tag="$2"
    local full_image="${image_name}:${image_tag}"
    
    echo -e "${BLUE}🔍 Verifying container image: ${full_image}${NC}"
    
    # Verify the signature
    cosign verify --key "${KEYS_DIR}/cosign.pub" "${full_image}"
    
    echo -e "${GREEN}✅ Image verification successful${NC}"
}

# Sign SBOM
sign_sbom() {
    local sbom_file="$1"
    local image_name="$2"
    local image_tag="$3"
    local full_image="${image_name}:${image_tag}"
    
    echo -e "${BLUE}📋 Signing SBOM: ${sbom_file}${NC}"
    
    # Attest SBOM to image
    cosign attest \
        --key "${KEYS_DIR}/cosign.key" \
        --predicate "${sbom_file}" \
        --type spdxjson \
        "${full_image}"
    
    echo -e "${GREEN}✅ SBOM signed and attached${NC}"
}

# Verify SBOM
verify_sbom() {
    local image_name="$1"
    local image_tag="$2"
    local full_image="${image_name}:${image_tag}"
    
    echo -e "${BLUE}🔍 Verifying SBOM for: ${full_image}${NC}"
    
    # Verify SBOM attestation
    cosign verify-attestation \
        --key "${KEYS_DIR}/cosign.pub" \
        --type spdxjson \
        "${full_image}"
    
    echo -e "${GREEN}✅ SBOM verification successful${NC}"
}

# Generate signing report
generate_report() {
    local image_name="$1"
    local image_tag="$2"
    local full_image="${image_name}:${image_tag}"
    
    echo -e "${BLUE}📊 Generating signing report...${NC}"
    
    local report_file="${COSIGN_DIR}/signing-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "${report_file}" << EOF
# Container Signing Report

**Generated:** $(date)
**Image:** ${full_image}
**Project:** AyazLogistics

## Signing Information

- **Private Key:** ${KEYS_DIR}/cosign.key
- **Public Key:** ${KEYS_DIR}/cosign.pub
- **Key Algorithm:** Ed25519
- **Signature Format:** Cosign

## Verification Commands

\`\`\`bash
# Verify image signature
cosign verify --key ${KEYS_DIR}/cosign.pub ${full_image}

# Verify SBOM attestation
cosign verify-attestation --key ${KEYS_DIR}/cosign.pub --type spdxjson ${full_image}

# List all signatures
cosign tree ${full_image}
\`\`\`

## Security Notes

- Private key is stored securely and should not be committed to version control
- Public key can be shared for verification purposes
- Signatures are stored in the container registry alongside the image

EOF

    echo -e "${GREEN}✅ Report generated: ${report_file}${NC}"
}

# Main execution
main() {
    local action="${1:-setup}"
    local image_name="${2:-ayazlogistics}"
    local image_tag="${3:-latest}"
    
    case "${action}" in
        "setup")
            echo -e "${BLUE}🚀 Setting up Cosign...${NC}"
            install_cosign
            generate_keys
            echo -e "${GREEN}🎉 Cosign setup completed!${NC}"
            ;;
        "sign")
            echo -e "${BLUE}✍️  Signing container image...${NC}"
            sign_image "${image_name}" "${image_tag}"
            ;;
        "verify")
            echo -e "${BLUE}🔍 Verifying container image...${NC}"
            verify_image "${image_name}" "${image_tag}"
            ;;
        "sign-sbom")
            local sbom_file="${4:-}"
            if [ -z "${sbom_file}" ]; then
                echo -e "${RED}❌ SBOM file path required${NC}"
                exit 1
            fi
            sign_sbom "${sbom_file}" "${image_name}" "${image_tag}"
            ;;
        "verify-sbom")
            verify_sbom "${image_name}" "${image_tag}"
            ;;
        "report")
            generate_report "${image_name}" "${image_tag}"
            ;;
        *)
            echo -e "${RED}❌ Unknown action: ${action}${NC}"
            echo -e "${BLUE}Usage: $0 {setup|sign|verify|sign-sbom|verify-sbom|report} [image_name] [image_tag] [sbom_file]${NC}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
