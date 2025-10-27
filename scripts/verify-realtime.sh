#!/bin/bash

# GreenOps Stack Verification Script
# This script verifies all components of the GreenOps stack

echo "=== GreenOps Stack Real-time Verification ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED${NC} - $2"
    else
        echo -e "${RED}❌ FAILED${NC} - $2"
    fi
}

# 1. Check Minikube status
echo "1. Checking Minikube status..."
minikube status > /dev/null 2>&1
print_status $? "Minikube cluster running"

# 2. Check Metrics Server
echo "2. Checking Metrics Server..."
kubectl top nodes > /dev/null 2>&1
print_status $? "Metrics Server providing live data"

# 3. Check Prometheus
echo "3. Checking Prometheus..."
curl -s http://localhost:9090/-/healthy > /dev/null 2>&1
print_status $? "Prometheus server responding"

# 4. Check Grafana
echo "4. Checking Grafana..."
curl -s http://localhost:3000/api/health > /dev/null 2>&1
print_status $? "Grafana server responding"

# 5. Check OpenCost
echo "5. Checking OpenCost..."
curl -s "http://localhost:9003/allocation/compute?window=1d" | grep -q '"code":200'
print_status $? "OpenCost API responding"

# 6. Check Kepler
echo "6. Checking Kepler..."
curl -s http://localhost:9102/metrics | grep -q "kepler_container"
print_status $? "Kepler metrics available"

# 7. Check Prometheus Integration
echo "7. Checking Prometheus Integration..."
curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[] | select(.labels.job == "opencost" or .labels.job == "kepler") | .health' | grep -q "up"
print_status $? "Prometheus scraping OpenCost and Kepler"

echo ""
echo "=== Verification Complete ==="