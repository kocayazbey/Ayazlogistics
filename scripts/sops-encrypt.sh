#!/bin/bash
# SOPS encryption script for AyazLogistics secrets

set -e

# Configuration
SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-~/.config/sops/age/keys.txt}"
ENCRYPTION_KEY="${SOPS_AGE_KEY:-}"

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

# Check if SOPS is installed
check_sops() {
    if ! command -v sops &> /dev/null; then
        log_error "SOPS is not installed. Please install it first."
        log_info "Installation: curl -LO https://github.com/mozilla/sops/releases/latest/download/sops-v3.7.3.linux"
        exit 1
    fi
}

# Check if age is installed
check_age() {
    if ! command -v age &> /dev/null; then
        log_error "age is not installed. Please install it first."
        log_info "Installation: go install filippo.io/age/cmd/age@latest"
        exit 1
    fi
}

# Generate age key if it doesn't exist
generate_age_key() {
    if [ ! -f "$SOPS_AGE_KEY_FILE" ]; then
        log_info "Generating new age key..."
        mkdir -p "$(dirname "$SOPS_AGE_KEY_FILE")"
        age-keygen -o "$SOPS_AGE_KEY_FILE"
        log_info "Age key generated at: $SOPS_AGE_KEY_FILE"
        log_warn "Please backup this key securely!"
    fi
}

# Get the public key from age key file
get_public_key() {
    if [ -f "$SOPS_AGE_KEY_FILE" ]; then
        grep "public key:" "$SOPS_AGE_KEY_FILE" | cut -d: -f2 | tr -d ' '
    else
        log_error "Age key file not found: $SOPS_AGE_KEY_FILE"
        exit 1
    fi
}

# Encrypt a file with SOPS
encrypt_file() {
    local file="$1"
    local encrypted_file="${file}.encrypted"
    
    if [ ! -f "$file" ]; then
        log_error "File not found: $file"
        return 1
    fi
    
    log_info "Encrypting $file..."
    
    # Create .sops.yaml if it doesn't exist
    if [ ! -f ".sops.yaml" ]; then
        local public_key=$(get_public_key)
        cat > .sops.yaml << EOF
creation_rules:
  - path_regex: .*\.encrypted$
    age: $public_key
  - path_regex: k8s/secrets/.*\.yaml$
    age: $public_key
EOF
        log_info "Created .sops.yaml configuration"
    fi
    
    # Encrypt the file
    sops --encrypt --in-place "$file"
    log_info "Encrypted: $file"
}

# Decrypt a file with SOPS
decrypt_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        log_error "File not found: $file"
        return 1
    fi
    
    log_info "Decrypting $file..."
    sops --decrypt --in-place "$file"
    log_info "Decrypted: $file"
}

# Encrypt all secret files
encrypt_all_secrets() {
    log_info "Encrypting all secret files..."
    
    # Find all secret files
    local secret_files=(
        "k8s/secrets/database-secret.yaml"
        "k8s/secrets/jwt-secret.yaml"
        "k8s/secrets/redis-secret.yaml"
        "k8s/secrets/api-keys.yaml"
        "k8s/secrets/external-services.yaml"
    )
    
    for file in "${secret_files[@]}"; do
        if [ -f "$file" ]; then
            encrypt_file "$file"
        else
            log_warn "Secret file not found: $file"
        fi
    done
    
    log_info "All secrets encrypted successfully!"
}

# Decrypt all secret files
decrypt_all_secrets() {
    log_info "Decrypting all secret files..."
    
    # Find all encrypted files
    local encrypted_files=$(find k8s/secrets -name "*.yaml" -type f)
    
    for file in $encrypted_files; do
        if grep -q "sops:" "$file"; then
            decrypt_file "$file"
        fi
    done
    
    log_info "All secrets decrypted successfully!"
}

# Create example secret files
create_example_secrets() {
    log_info "Creating example secret files..."
    
    # Database secret
    cat > k8s/secrets/database-secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ayazlogistics-database-secret
  namespace: production
type: Opaque
stringData:
  database-url: "postgresql://username:password@localhost:5432/ayazlogistics"
  database-password: "your-secure-password"
  database-username: "ayazlogistics_user"
EOF

    # JWT secret
    cat > k8s/secrets/jwt-secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ayazlogistics-jwt-secret
  namespace: production
type: Opaque
stringData:
  jwt-secret: "your-jwt-secret-key-minimum-32-characters"
  jwt-refresh-secret: "your-jwt-refresh-secret-key-minimum-32-characters"
  session-secret: "your-session-secret-key-minimum-32-characters"
EOF

    # Redis secret
    cat > k8s/secrets/redis-secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ayazlogistics-redis-secret
  namespace: production
type: Opaque
stringData:
  redis-password: "your-redis-password"
  redis-host: "redis-service"
  redis-port: "6379"
EOF

    # API keys secret
    cat > k8s/secrets/api-keys.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ayazlogistics-api-keys
  namespace: production
type: Opaque
stringData:
  sendgrid-api-key: "your-sendgrid-api-key"
  sentry-dsn: "your-sentry-dsn"
  stripe-secret-key: "your-stripe-secret-key"
  aws-access-key: "your-aws-access-key"
  aws-secret-key: "your-aws-secret-key"
EOF

    # External services secret
    cat > k8s/secrets/external-services.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ayazlogistics-external-services
  namespace: production
type: Opaque
stringData:
  payment-gateway-key: "your-payment-gateway-key"
  sms-provider-key: "your-sms-provider-key"
  email-provider-key: "your-email-provider-key"
  cdn-provider-key: "your-cdn-provider-key"
EOF

    log_info "Example secret files created!"
    log_warn "Please update the secret values before encrypting!"
}

# Main function
main() {
    case "${1:-help}" in
        "encrypt")
            check_sops
            check_age
            generate_age_key
            encrypt_all_secrets
            ;;
        "decrypt")
            check_sops
            check_age
            decrypt_all_secrets
            ;;
        "create-examples")
            create_example_secrets
            ;;
        "setup")
            check_sops
            check_age
            generate_age_key
            create_example_secrets
            log_info "Setup complete! Please update secret values and run 'encrypt'"
            ;;
        "help"|*)
            echo "Usage: $0 {encrypt|decrypt|create-examples|setup|help}"
            echo ""
            echo "Commands:"
            echo "  encrypt         - Encrypt all secret files"
            echo "  decrypt         - Decrypt all secret files"
            echo "  create-examples - Create example secret files"
            echo "  setup           - Initial setup (generate key + examples)"
            echo "  help            - Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  SOPS_AGE_KEY_FILE - Path to age key file (default: ~/.config/sops/age/keys.txt)"
            echo "  SOPS_AGE_KEY      - Age encryption key"
            ;;
    esac
}

# Run main function
main "$@"
