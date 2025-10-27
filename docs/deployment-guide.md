# Deployment Guide

## Overview

This guide provides instructions for deploying the GreenOps Advisor application in production environments.

## Prerequisites

### Infrastructure Requirements
- Kubernetes cluster (v1.20+)
- 2 GB RAM and 2 CPU cores minimum
- 10 GB persistent storage
- Internet connectivity for external services

### External Services
- Supabase account with PostgreSQL database
- Prometheus monitoring stack
- Kepler energy monitoring (optional)
- Ollama, OpenAI, or Anthropic AI service
- GitHub account for webhook integration (optional)

### CLI Tools
- kubectl (v1.20+)
- helm (v3.0+)
- docker (optional for local testing)

## Production Deployment

### 1. Environment Configuration

Create a namespace for the application:
```bash
kubectl create namespace greenops
```

Set up secrets for external services:
```bash
# Supabase credentials
kubectl create secret generic supabase-credentials \
  --from-literal=url=your-supabase-url \
  --from-literal=key=your-supabase-key \
  --namespace greenops

# GitHub webhook secret (if using GitHub integration)
kubectl create secret generic github-webhook \
  --from-literal=secret=your-webhook-secret \
  --namespace greenops

# GitHub App private key (if using GitHub integration)
kubectl create secret generic github-app-key \
  --from-file=private-key.pem=path/to/your/private-key.pem \
  --namespace greenops

# AI provider credentials (configure as needed)
kubectl create secret generic ai-credentials \
  --from-literal=openai-key=your-openai-key \
  --from-literal=anthropic-key=your-anthropic-key \
  --namespace greenops
```

### 2. Deploy Monitoring Components

Deploy Prometheus (if not already available):
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace
```

Deploy Kepler (optional, for energy monitoring):
```bash
# Follow Kepler deployment guide at https://github.com/sustainable-computing-io/kepler
```

### 3. Deploy Application Components

Deploy the application using the provided manifests:
```bash
kubectl apply -f k8s-manifests/
```

This will deploy:
- Backend service with security hardening
- Frontend service
- Network policies
- RBAC configurations
- Monitoring configurations
- Backup configurations

### 4. Configure External Services

Update the ConfigMap with your specific configuration:
```bash
kubectl edit configmap greenops-config -n greenops
```

Key configuration parameters:
- SUPABASE_URL: Your Supabase project URL
- PROMETHEUS_URL: Prometheus service URL
- KEPLER_URL: Kepler service URL (if used)
- OLLAMA_URL: Ollama service URL (if used)
- CLUSTER_NAME: Your Kubernetes cluster name
- CARBON_INTENSITY_G_PER_KWH: Carbon intensity for your region

### 5. Verify Deployment

Check pod status:
```bash
kubectl get pods -n greenops
```

Check service status:
```bash
kubectl get services -n greenops
```

Check deployment status:
```bash
kubectl get deployments -n greenops
```

Verify application health:
```bash
kubectl port-forward service/greenops-backend 7860:7860 -n greenops
# In another terminal:
curl http://localhost:7860/health
```

## Ingress Configuration

To expose the application externally, configure an ingress controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: greenops-ingress
  namespace: greenops
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: greenops.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: greenops-frontend
            port:
              number: 3000
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: greenops-backend
            port:
              number: 7860
```

Apply the ingress:
```bash
kubectl apply -f ingress.yaml
```

## Scaling Configuration

### Horizontal Pod Autoscaler
```bash
# Enable metrics server if not already installed
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Apply HPA for backend
kubectl autoscale deployment greenops-backend -n greenops \
  --cpu-percent=70 \
  --min=2 \
  --max=10

# Apply HPA for frontend
kubectl autoscale deployment greenops-frontend -n greenops \
  --cpu-percent=70 \
  --min=2 \
  --max=10
```

### Resource Limits
The deployment manifests already include resource requests and limits. Adjust as needed based on your environment:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## Monitoring and Alerting

### Prometheus Integration
The application exposes metrics at `/metrics` endpoint. Configure Prometheus to scrape these metrics:

```yaml
- job_name: 'greenops-backend'
  static_configs:
  - targets: ['greenops-backend.greenops.svc.cluster.local:7860']
```

### Grafana Dashboard
Import the provided Grafana dashboard:
```bash
kubectl create configmap grafana-dashboard \
  --from-file=grafana-dashboard.json \
  --namespace greenops
```

### Alerting Rules
The monitoring.yaml file includes alerting rules for common issues. Customize thresholds based on your requirements.

## Backup and Recovery

### Automated Backups
The backup.yaml file includes Velero schedules for daily and weekly backups. Ensure Velero is installed and configured:

```bash
# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.6.0 \
  --bucket your-bucket \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=false
```

### Manual Backup
Run the backup script:
```bash
./scripts/backup.sh
```

### Disaster Recovery
In case of disaster, use the recovery script:
```bash
./scripts/disaster-recovery.sh
```

## Upgrading

### Rolling Updates
The deployments are configured for rolling updates. To update the application:

1. Update the Docker images in the deployment manifests
2. Apply the updated manifests:
   ```bash
   kubectl apply -f k8s-manifests/
   ```

### Blue-Green Deployment
For zero-downtime deployments, consider using a blue-green deployment strategy:

1. Deploy new version with different labels
2. Test the new version
3. Update service to point to new version
4. Remove old version

## Troubleshooting

### Common Issues

#### Issue: Pods stuck in CrashLoopBackOff
- Check pod logs: `kubectl logs -n greenops <pod-name>`
- Verify environment variables and secrets
- Check resource limits and requests

#### Issue: Service not accessible
- Verify service configuration: `kubectl describe service -n greenops`
- Check network policies: `kubectl describe networkpolicy -n greenops`
- Verify ingress configuration if using external access

#### Issue: Database connectivity
- Verify Supabase credentials
- Check network connectivity to Supabase
- Review Supabase service status

### Health Checks
The application includes health check endpoints:
- `/health`: Basic health check
- `/metrics`: Prometheus metrics endpoint
- `/ready`: Readiness probe

Monitor these endpoints for application health.

## Post-Deployment Validation

### Functional Testing
1. Access the frontend dashboard
2. Verify metrics are being collected
3. Check that opportunities are being identified
4. Test the Apply Fix functionality
5. Verify GitHub integration if configured

### Performance Testing
1. Monitor resource utilization
2. Check response times
3. Verify scalability under load
4. Review monitoring dashboards

### Security Validation
1. Verify network policies are working
2. Check RBAC configurations
3. Review security contexts
4. Validate secret management

## Contact Information

For support, contact:
- DevOps Team: devops@company.com
- Security Team: security@company.com