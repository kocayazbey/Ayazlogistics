#!/bin/bash
# Git signing setup script for AyazLogistics

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

# Check if Git is installed
check_git() {
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
}

# Check if GPG is installed
check_gpg() {
    if ! command -v gpg &> /dev/null; then
        log_error "GPG is not installed. Please install GPG first."
        log_info "Installation: apt-get install gnupg (Ubuntu/Debian) or brew install gnupg (macOS)"
        exit 1
    fi
}

# Generate GPG key
generate_gpg_key() {
    log_info "Generating GPG key..."
    
    # Check if GPG key already exists
    if gpg --list-secret-keys --keyid-format LONG | grep -q "sec"; then
        log_warn "GPG key already exists. Skipping key generation."
        return 0
    fi
    
    # Generate GPG key
    gpg --full-generate-key --batch << EOF
%no-protection
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: AyazLogistics Developer
Name-Email: developer@ayazlogistics.com
Expire-Date: 0
%commit
EOF
    
    log_info "GPG key generated successfully"
}

# Configure Git signing
configure_git_signing() {
    log_info "Configuring Git signing..."
    
    # Get the GPG key ID
    local gpg_key_id=$(gpg --list-secret-keys --keyid-format LONG | grep "sec" | head -1 | awk '{print $2}' | cut -d'/' -f2)
    
    if [ -z "$gpg_key_id" ]; then
        log_error "Could not find GPG key ID"
        exit 1
    fi
    
    # Configure Git to use GPG signing
    git config --global user.signingkey "$gpg_key_id"
    git config --global commit.gpgsign true
    git config --global tag.gpgsign true
    git config --global gpg.program gpg
    
    log_info "Git signing configured with key ID: $gpg_key_id"
}

# Export GPG public key
export_gpg_key() {
    log_info "Exporting GPG public key..."
    
    # Get the GPG key ID
    local gpg_key_id=$(gpg --list-secret-keys --keyid-format LONG | grep "sec" | head -1 | awk '{print $2}' | cut -d'/' -f2)
    
    if [ -z "$gpg_key_id" ]; then
        log_error "Could not find GPG key ID"
        exit 1
    fi
    
    # Export public key
    gpg --armor --export "$gpg_key_id" > gpg-public-key.asc
    
    log_info "GPG public key exported to: gpg-public-key.asc"
    log_info "Please add this key to your GitHub account: https://github.com/settings/keys"
}

# Test Git signing
test_git_signing() {
    log_info "Testing Git signing..."
    
    # Create a test commit
    echo "test" > test-file.txt
    git add test-file.txt
    git commit -S -m "test: verify GPG signing"
    
    # Verify the commit signature
    if git log --show-signature --oneline -n 1 | grep -q "Good signature"; then
        log_info "✅ Git signing test successful"
    else
        log_error "❌ Git signing test failed"
        exit 1
    fi
    
    # Clean up test file
    git reset --hard HEAD~1
    rm -f test-file.txt
    
    log_info "Git signing test completed"
}

# Configure Git hooks
configure_git_hooks() {
    log_info "Configuring Git hooks..."
    
    # Create .git/hooks directory if it doesn't exist
    mkdir -p .git/hooks
    
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook to ensure commits are signed

# Check if commit is signed
if ! git log --show-signature --oneline -n 1 | grep -q "Good signature"; then
    echo "❌ Commit must be signed!"
    echo "Please use: git commit -S -m 'your message'"
    exit 1
fi

echo "✅ Commit is properly signed"
EOF

    # Create commit-msg hook
    cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Commit message hook to enforce conventional commits

commit_regex='^(feat|fix|docs|style|refactor|test|chore|ci|build|perf|revert)(\(.+\))?: .+'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ Invalid commit message format!"
    echo "Please use: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore, ci, build, perf, revert"
    exit 1
fi

echo "✅ Commit message follows conventional format"
EOF

    # Make hooks executable
    chmod +x .git/hooks/pre-commit
    chmod +x .git/hooks/commit-msg
    
    log_info "Git hooks configured successfully"
}

# Configure branch protection
configure_branch_protection() {
    log_info "Configuring branch protection..."
    
    # Create branch protection script
    cat > scripts/branch-protection.sh << 'EOF'
#!/bin/bash
# Branch protection script

# Check if force push is attempted
if [ "$1" = "force" ]; then
    echo "❌ Force push is not allowed!"
    echo "Please use: git push origin branch-name"
    exit 1
fi

# Check if pushing to protected branch
if [ "$2" = "refs/heads/main" ] || [ "$2" = "refs/heads/develop" ]; then
    echo "⚠️  Pushing to protected branch: $2"
    echo "Please ensure all commits are signed and follow conventional format"
fi

echo "✅ Push allowed"
EOF

    chmod +x scripts/branch-protection.sh
    
    log_info "Branch protection configured"
}

# Verify Git configuration
verify_git_config() {
    log_info "Verifying Git configuration..."
    
    # Check Git configuration
    local signing_key=$(git config --get user.signingkey)
    local commit_gpgsign=$(git config --get commit.gpgsign)
    local tag_gpgsign=$(git config --get tag.gpgsign)
    
    if [ -z "$signing_key" ]; then
        log_error "❌ GPG signing key not configured"
        return 1
    fi
    
    if [ "$commit_gpgsign" != "true" ]; then
        log_error "❌ Commit signing not enabled"
        return 1
    fi
    
    if [ "$tag_gpgsign" != "true" ]; then
        log_error "❌ Tag signing not enabled"
        return 1
    fi
    
    log_info "✅ Git configuration is valid"
    return 0
}

# Generate signing report
generate_signing_report() {
    log_info "Generating signing report..."
    
    # Create signing report
    cat > signing-report.md << EOF
# Git Signing Report

Generated on: $(date)

## Configuration

- **GPG Key ID**: $(git config --get user.signingkey)
- **Commit Signing**: $(git config --get commit.gpgsign)
- **Tag Signing**: $(git config --get tag.gpgsign)
- **GPG Program**: $(git config --get gpg.program)

## Recent Signed Commits

EOF

    # Add recent commits
    git log --show-signature --oneline -n 10 >> signing-report.md
    
    # Add GPG key information
    cat >> signing-report.md << EOF

## GPG Key Information

EOF

    gpg --list-secret-keys --keyid-format LONG >> signing-report.md
    
    log_info "Signing report generated: signing-report.md"
}

# Main function
main() {
    case "${1:-help}" in
        "setup")
            check_git
            check_gpg
            generate_gpg_key
            configure_git_signing
            export_gpg_key
            test_git_signing
            configure_git_hooks
            configure_branch_protection
            verify_git_config
            generate_signing_report
            log_info "Git signing setup complete!"
            ;;
        "test")
            test_git_signing
            ;;
        "verify")
            verify_git_config
            ;;
        "report")
            generate_signing_report
            ;;
        "help"|*)
            echo "Usage: $0 {setup|test|verify|report|help}"
            echo ""
            echo "Commands:"
            echo "  setup   - Complete Git signing setup"
            echo "  test    - Test Git signing"
            echo "  verify  - Verify Git configuration"
            echo "  report  - Generate signing report"
            echo "  help    - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 setup"
            echo "  $0 test"
            echo "  $0 verify"
            echo "  $0 report"
            ;;
    esac
}

# Run main function
main "$@"
