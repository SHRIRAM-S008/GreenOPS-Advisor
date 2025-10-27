#!/bin/bash

# Script to start all port forwards needed for GreenOps demo

echo "Starting port forwards for GreenOps demo..."
echo "========================================"

# Kill any existing port forwards
echo "Cleaning up existing port forwards..."
lsof -ti:9090 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:9003 | xargs kill -9 2>/dev/null
lsof -ti:9102 | xargs kill -9 2>/dev/null

# Start Prometheus port forward
echo "Starting Prometheus port forward..."
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090 > /dev/null 2>&1 &
sleep 2

# Start Grafana port forward
echo "Starting Grafana port forward..."
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 > /dev/null 2>&1 &
sleep 2

# Start OpenCost port forward
echo "Starting OpenCost port forward..."
kubectl port-forward -n opencost svc/opencost 9003:9003 > /dev/null 2>&1 &
sleep 2

# Start Kepler port forward
echo "Starting Kepler port forward..."
kubectl port-forward -n kepler svc/kepler 9102:9102 > /dev/null 2>&1 &
sleep 2

echo ""
echo "All port forwards started successfully!"
echo "======================================"
echo "Access the services at:"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3000"
echo "- OpenCost: http://localhost:9003"
echo "- Kepler: http://localhost:9102/metrics"
echo ""
echo "To stop port forwards, run: pkill -f 'kubectl port-forward'"