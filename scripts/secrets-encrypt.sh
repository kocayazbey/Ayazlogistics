#!/bin/bash

# SOPS encryption script for AyazLogistics secrets
set -e

# Check if SOPS is installed
if ! command -v sops &> /dev/null; then
    echo "SOPS is not installed. Please install it first:"
    echo "curl -LO https://github.com/mozilla/sops/releases/latest/download/sops-v3.8.1.linux.amd64"
    echo "chmod +x sops-v3.8.1.linux.amd64"
    echo "sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops"
    exit 1
fi

# Check if kubeseal is installed
if ! command -v kubeseal &> /dev/null; then
    echo "kubeseal is not installed. Please install it first:"
    echo "wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.5/kubeseal-0.24.5-linux-amd64.tar.gz"
    echo "tar -xvzf kubeseal-0.24.5-linux-amd64.tar.gz"
    echo "sudo mv kubeseal /usr/local/bin/"
    exit 1
fi

# Create secrets directory if it doesn't exist
mkdir -p k8s/secrets

# Encrypt with SOPS
echo "Encrypting secrets with SOPS..."
sops -e -i k8s/secrets/ayazlogistics-secrets.yaml

# Create sealed secret
echo "Creating sealed secret..."
kubeseal -f k8s/secrets/ayazlogistics-secrets.yaml -w k8s/secrets/ayazlogistics-sealed-secret.yaml

echo "Secrets encrypted and sealed successfully!"
echo "Files created:"
echo "- k8s/secrets/ayazlogistics-secrets.yaml (SOPS encrypted)"
echo "- k8s/secrets/ayazlogistics-sealed-secret.yaml (Sealed Secret)"
