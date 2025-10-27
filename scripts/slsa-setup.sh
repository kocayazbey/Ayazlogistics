#!/bin/bash
# SLSA setup script for AyazLogistics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check for slsa-verifier
    if ! command -v slsa-verifier &> /dev/null; then
        log_error "slsa-verifier is not installed"
        log_info "Install: go install github.com/slsa-framework/slsa-verifier/v2/cli/slsa-verifier@latest"
        exit 1
    fi
    
    # Check for in-toto tools
    if ! command -v in-toto-attestation &> /dev/null; then
        log_error "in-toto-attestation is not installed"
        log_info "Install: pip install in-toto"
        exit 1
    fi
    
    # Check for cosign
    if ! command -v cosign &> /dev/null; then
        log_error "cosign is not installed"
        log_info "Install: go install github.com/sigstore/cosign/cmd/cosign@latest"
        exit 1
    fi
    
    log_info "All dependencies are installed"
}

# Generate SLSA key pair
generate_slsa_keys() {
    log_info "Generating SLSA key pair..."
    
    # Create .slsa directory
    mkdir -p .slsa
    
    # Generate private key
    openssl genpkey -algorithm RSA -out .slsa/private-key.pem -pkcs8 -pass pass:slsa-key
    chmod 600 .slsa/private-key.pem
    
    # Generate public key
    openssl rsa -pubout -in .slsa/private-key.pem -out .slsa/public-key.pem -passin pass:slsa-key
    
    log_info "SLSA keys generated in .slsa/ directory"
    log_warn "Please backup the private key securely!"
}

# Create SLSA configuration
create_slsa_config() {
    log_info "Creating SLSA configuration..."
    
    cat > .slsa/config.yaml << EOF
# SLSA Configuration for AyazLogistics
version: "1.0"
build_type: "https://github.com/slsa-framework/slsa-github-actions/actions/build@v1.6.0"
builder_id: "https://github.com/slsa-framework/slsa-github-actions/actions/build@v1.6.0"
build_invocation_id: "$(uuidgen)"
build_started_on: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
build_finished_on: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
build_dependencies:
  - uri: "git+https://github.com/${{ github.repository }}"
    digest:
      git_commit: "${{ github.sha }}"
  - uri: "https://github.com/actions/checkout@v4"
    digest:
      sha1: "checkout-action-sha1"
  - uri: "https://github.com/actions/setup-node@v4"
    digest:
      sha1: "setup-node-action-sha1"
materials:
  - uri: "git+https://github.com/${{ github.repository }}"
    digest:
      git_commit: "${{ github.sha }}"
  - uri: "https://github.com/actions/checkout@v4"
    digest:
      sha1: "checkout-action-sha1"
  - uri: "https://github.com/actions/setup-node@v4"
    digest:
      sha1: "setup-node-action-sha1"
EOF

    log_info "SLSA configuration created"
}

# Create SLSA provenance for local build
create_local_provenance() {
    log_info "Creating local SLSA provenance..."
    
    # Create provenance directory
    mkdir -p .slsa
    
    # Generate provenance
    cat > .slsa/provenance.json << EOF
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "predicateType": "https://slsa.dev/provenance/v1",
  "subject": [
    {
      "name": "ayazlogistics-backend",
      "digest": {
        "sha256": "$(sha256sum dist/main.js | cut -d' ' -f1)"
      }
    },
    {
      "name": "ayazlogistics-frontend",
      "digest": {
        "sha256": "$(sha256sum frontend/admin-panel/dist/index.html | cut -d' ' -f1)"
      }
    }
  ],
  "predicate": {
    "buildType": "https://github.com/slsa-framework/slsa-github-actions/actions/build@v1.6.0",
    "builder": {
      "id": "https://github.com/slsa-framework/slsa-github-actions/actions/build@v1.6.0"
    },
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/${{ github.repository }}",
        "digest": {
          "sha1": "${{ github.sha }}"
        }
      },
      "parameters": {
        "source": "git+https://github.com/${{ github.repository }}",
        "build_command": "npm run build",
        "test_command": "npm run test:ci"
      }
    },
    "buildConfig": {
      "uri": "git+https://github.com/${{ github.repository }}",
      "digest": {
        "sha1": "${{ github.sha }}"
      }
    },
    "metadata": {
      "buildInvocationId": "$(uuidgen)",
      "buildStartedOn": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "buildFinishedOn": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "completeness": {
        "parameters": true,
        "environment": true,
        "materials": true
      },
      "reproducible": true
    },
    "materials": [
      {
        "uri": "git+https://github.com/${{ github.repository }}",
        "digest": {
          "sha1": "${{ github.sha }}"
        }
      }
    ]
  }
}
EOF

    log_info "Local SLSA provenance created"
}

# Verify SLSA provenance
verify_provenance() {
    local provenance_file="$1"
    local artifact_path="$2"
    
    if [ ! -f "$provenance_file" ]; then
        log_error "Provenance file not found: $provenance_file"
        return 1
    fi
    
    if [ ! -f "$artifact_path" ]; then
        log_error "Artifact not found: $artifact_path"
        return 1
    fi
    
    log_info "Verifying SLSA provenance..."
    
    # Verify provenance
    slsa-verifier verify-artifact \
        --provenance-path "$provenance_file" \
        --source-uri "github.com/${{ github.repository }}" \
        --source-tag "${{ github.ref_name }}" \
        "$artifact_path"
    
    log_info "SLSA provenance verified successfully"
}

# Create attestation
create_attestation() {
    local provenance_file="$1"
    local output_file="$2"
    
    if [ ! -f "$provenance_file" ]; then
        log_error "Provenance file not found: $provenance_file"
        return 1
    fi
    
    log_info "Creating attestation..."
    
    # Create in-toto attestation
    in-toto-attestation create \
        --predicate-type "https://slsa.dev/provenance/v1" \
        --predicate "$provenance_file" \
        --private-key ".slsa/private-key.pem" \
        --out "$output_file"
    
    log_info "Attestation created: $output_file"
}

# Sign artifacts with cosign
sign_artifacts() {
    local artifact_path="$1"
    
    if [ ! -f "$artifact_path" ]; then
        log_error "Artifact not found: $artifact_path"
        return 1
    fi
    
    log_info "Signing artifacts with cosign..."
    
    # Sign the artifact
    cosign sign-blob \
        --key .slsa/private-key.pem \
        --output-signature "${artifact_path}.sig" \
        --output-certificate "${artifact_path}.cert" \
        "$artifact_path"
    
    log_info "Artifact signed: ${artifact_path}.sig"
}

# Main function
main() {
    case "${1:-help}" in
        "setup")
            check_dependencies
            generate_slsa_keys
            create_slsa_config
            log_info "SLSA setup complete!"
            ;;
        "provenance")
            create_local_provenance
            ;;
        "verify")
            verify_provenance "${2:-.slsa/provenance.json}" "${3:-dist/main.js}"
            ;;
        "attestation")
            create_attestation "${2:-.slsa/provenance.json}" "${3:-attestation.json}"
            ;;
        "sign")
            sign_artifacts "${2:-dist/main.js}"
            ;;
        "help"|*)
            echo "Usage: $0 {setup|provenance|verify|attestation|sign|help}"
            echo ""
            echo "Commands:"
            echo "  setup       - Initial SLSA setup"
            echo "  provenance  - Create local provenance"
            echo "  verify      - Verify SLSA provenance"
            echo "  attestation - Create attestation"
            echo "  sign        - Sign artifacts with cosign"
            echo "  help        - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 setup"
            echo "  $0 provenance"
            echo "  $0 verify .slsa/provenance.json dist/main.js"
            echo "  $0 attestation .slsa/provenance.json attestation.json"
            echo "  $0 sign dist/main.js"
            ;;
    esac
}

# Run main function
main "$@"
