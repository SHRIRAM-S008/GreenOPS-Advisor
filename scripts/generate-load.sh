#!/bin/bash

# Script to generate load for GreenOps demo

echo "Starting load generation for GreenOps demo..."
echo "=========================================="

# Check if stress pod already exists
if kubectl get pod stress >/dev/null 2>&1; then
    echo "Stress pod already exists. Deleting it first..."
    kubectl delete pod stress
    sleep 5
fi

# Create stress pod
echo "Creating stress pod..."
kubectl run stress --image=busybox -- /bin/sh -c "while true; do wget -q -O- http://overprovisioned-app.demo-app.svc.cluster.local || true; done" > /dev/null 2>&1

# Check if loadtest pod already exists
if kubectl get pod loadtest >/dev/null 2>&1; then
    echo "Loadtest pod already exists. Deleting it first..."
    kubectl delete pod loadtest
    sleep 5
fi

# Create loadtest pod
echo "Creating loadtest pod..."
kubectl run loadtest --image=busybox -- /bin/sh -c "while true; do wget -q -O- http://overprovisioned-app.demo-app.svc.cluster.local; done" > /dev/null 2>&1

echo ""
echo "Load generation started!"
echo "========================"
echo "Monitor the following to see the effects:"
echo "1. Grafana dashboard - CPU/Memory usage should increase"
echo "2. Kepler metrics - Energy consumption should increase"
echo "3. OpenCost metrics - Cost should gradually increase"
echo ""
echo "To stop the load generation, run:"
echo "kubectl delete pod stress loadtest"