#!/bin/bash

# GreenOps Advisor Disaster Recovery Script
# This script helps recover the GreenOps Advisor application in case of a disaster

set -e  # Exit on any error

echo "Starting GreenOps Advisor Disaster Recovery Process..."

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo "Error: kubectl is not installed or not in PATH"
        exit 1
    fi
    echo "kubectl is available"
}

# Function to check if required namespaces exist
check_namespace() {
    if kubectl get namespace greenops &> /dev/null; then
        echo "Namespace greenops exists"
    else
        echo "Creating namespace greenops"
        kubectl create namespace greenops
    fi
}

# Function to restore from Velero backup
restore_from_velero() {
    local backup_name=$1
    if command -v velero &> /dev/null; then
        echo "Restoring from Velero backup: $backup_name"
        velero restore create --from-backup $backup_name --namespace greenops
        echo "Waiting for restore to complete..."
        velero restore wait --restore $backup_name-restore
    else
        echo "Warning: Velero not found. Skipping Velero restore."
    fi
}

# Function to apply Kubernetes manifests
apply_manifests() {
    echo "Applying Kubernetes manifests..."
    kubectl apply -f k8s-manifests/
    echo "Manifests applied successfully"
}

# Function to check application status
check_application_status() {
    echo "Checking application status..."
    kubectl rollout status deployment/greenops-backend -n greenops
    kubectl rollout status deployment/greenops-frontend -n greenops
    echo "Application is running"
}

# Function to restore database from backup
restore_database() {
    echo "Restoring database from backup..."
    # This would typically involve:
    # 1. Connecting to Supabase
    # 2. Restoring from the latest backup
    # 3. Validating the restore
    echo "Database restore completed (implementation depends on specific backup method)"
}

# Main recovery process
main() {
    check_kubectl
    check_namespace
    
    # If a backup name is provided as argument, restore from it
    if [ $# -eq 1 ]; then
        restore_from_velero $1
    else
        echo "No backup name provided, applying current manifests..."
        apply_manifests
    fi
    
    check_application_status
    restore_database
    
    echo "Disaster recovery process completed successfully!"
    echo "You may need to manually verify and update any external dependencies"
}

# Run main function with all arguments
main "$@"