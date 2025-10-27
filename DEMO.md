# GreenOps Advisor Demo

This repository contains a complete GreenOps stack for optimizing Kubernetes cost and carbon footprint.

## 🌟 Key Features

- Real-time metrics collection from Kubernetes clusters
- Energy consumption monitoring with Kepler
- Cost allocation analysis with OpenCost
- AI-powered optimization recommendations with Ollama
- Visualization dashboards with Grafana

## 🚀 Components

1. **Minikube** - Local Kubernetes cluster
2. **Prometheus** - Metrics collection and storage
3. **Grafana** - Visualization dashboard
4. **OpenCost** - Cost allocation and monitoring
5. **Kepler** - Energy consumption monitoring
6. **Ollama** - Local AI for optimization recommendations

## ▶️ Quick Start

1. Ensure all components are running:
   ```bash
   ./scripts/verify-realtime.sh
   ```

2. Access the dashboards:
   - Grafana: http://localhost:3000 (admin/prom-operator)
   - Prometheus: http://localhost:9090
   - OpenCost: http://localhost:9003
   - Kepler: http://localhost:9102/metrics

3. Generate AI recommendations:
   ```bash
   ./scripts/run-ai-advisor.sh
   ```
   
   Or directly:
   ```bash
   source ~/greenops-advisor/backend/venv/bin/activate && python3 ./scripts/ai-advisor.py
   ```

## 📊 Dashboard Setup

Import the sample dashboard JSON to visualize:
- CPU and memory utilization
- Energy consumption in joules
- Cost allocation by namespace
- Optimization opportunities

## 🎯 Optimization Goals

The AI advisor can help you:
- Reduce carbon footprint by 10-20% through resource optimization
- Lower infrastructure costs by rightsizing workloads (potential savings up to 50%)
- Improve cluster efficiency by 10% through better resource scheduling
- Identify underutilized resources and recommend actions

## 🤖 AI Advisor Features

The AI advisor analyzes:
- Cost data from OpenCost
- Energy consumption from Kepler
- Cluster utilization from Prometheus

It provides actionable recommendations for:
1. Reducing energy consumption
2. Rightsizing workloads
3. Improving cluster efficiency

## 📞 Contact

For questions or feedback, please open an issue in this repository.