#!/bin/bash

# GreenOps Advisor Backup Script
# This script creates backups of the GreenOps Advisor application

set -e  # Exit on any error

echo "Starting GreenOps Advisor Backup Process..."

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo "Error: kubectl is not installed or not in PATH"
        exit 1
    fi
    echo "kubectl is available"
}

# Function to create timestamp
get_timestamp() {
    date +"%Y%m%d-%H%M%S"
}

# Function to backup Kubernetes resources
backup_kubernetes_resources() {
    local timestamp=$(get_timestamp)
    local backup_dir="backups/k8s-$timestamp"
    
    echo "Creating backup directory: $backup_dir"
    mkdir -p $backup_dir
    
    echo "Backing up Kubernetes resources..."
    kubectl get all -n greenops -o yaml > $backup_dir/all-resources.yaml
    kubectl get configmaps -n greenops -o yaml > $backup_dir/configmaps.yaml
    kubectl get secrets -n greenops -o yaml > $backup_dir/secrets.yaml
    kubectl get persistentvolumeclaims -n greenops -o yaml > $backup_dir/pvcs.yaml
    
    echo "Kubernetes resources backed up to $backup_dir"
}

# Function to backup application code and configs
backup_application_code() {
    local timestamp=$(get_timestamp)
    local backup_dir="backups/app-$timestamp"
    
    echo "Creating backup directory: $backup_dir"
    mkdir -p $backup_dir
    
    echo "Backing up application code and configurations..."
    cp -r backend/ $backup_dir/backend/
    cp -r frontend/ $backup_dir/frontend/
    cp -r k8s-manifests/ $backup_dir/k8s-manifests/
    cp -r scripts/ $backup_dir/scripts/
    cp *.md $backup_dir/ 2>/dev/null || true
    cp *.json $backup_dir/ 2>/dev/null || true
    cp *.yml $backup_dir/ 2>/dev/null || true
    
    echo "Application code and configurations backed up to $backup_dir"
}

# Function to backup database (placeholder)
backup_database() {
    local timestamp=$(get_timestamp)
    local backup_dir="backups/db-$timestamp"
    
    echo "Creating backup directory: $backup_dir"
    mkdir -p $backup_dir
    
    echo "Backing up database..."
    # This would typically involve:
    # 1. Connecting to Supabase
    # 2. Creating a database dump
    # 3. Saving it to the backup directory
    echo "Database backup placeholder - implementation depends on specific backup method"
    
    echo "Database backup process completed"
}

# Function to compress backups
compress_backups() {
    local timestamp=$(get_timestamp)
    echo "Compressing backups..."
    tar -czf "backups/greenops-backup-$timestamp.tar.gz" -C backups .
    echo "Backups compressed to backups/greenops-backup-$timestamp.tar.gz"
}

# Function to clean old backups
clean_old_backups() {
    echo "Cleaning old backups (older than 30 days)..."
    find backups/ -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true
    find backups/ -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
    echo "Old backups cleaned"
}

# Main backup process
main() {
    check_kubectl
    
    echo "Creating backups directory if it doesn't exist..."
    mkdir -p backups
    
    backup_kubernetes_resources
    backup_application_code
    backup_database
    compress_backups
    clean_old_backups
    
    echo "Backup process completed successfully!"
    echo "Backup files are stored in the backups/ directory"
}

# Run main function
main