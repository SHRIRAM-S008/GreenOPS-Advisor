# Operations Runbook

## Overview

This document provides operational procedures for managing the GreenOps Advisor application in production environments.

## Daily Operations

### Metrics Collection
```bash
# Trigger manual metrics collection
curl -X POST http://localhost:7860/collect_metrics

# Check collection status
curl http://localhost:7860/health
```

### Monitoring Dashboard
- Access Grafana dashboard at `http://localhost:3000`
- Monitor key metrics:
  - CPU and memory utilization
  - Cost savings achieved
  - Carbon footprint reduction
  - Application performance

### Log Review
```bash
# Check backend logs
kubectl logs -n greenops -l app=greenops-backend

# Check frontend logs
kubectl logs -n greenops -l app=greenops-frontend
```

## Weekly Operations

### Database Maintenance
```bash
# Check database size and performance
# This would typically be done through Supabase dashboard or CLI
```

### Backup Verification
```bash
# Run backup script
./scripts/backup.sh

# Verify backup integrity
# Check backup artifacts in backups/ directory
```

### Security Updates
- Review and apply security updates for dependencies
- Check for vulnerability reports
- Update container images

## Monthly Operations

### Performance Review
- Analyze system performance metrics
- Optimize database queries if needed
- Review and adjust resource allocations

### Capacity Planning
- Review storage usage and plan for expansion
- Analyze growth trends and forecast requirements
- Plan for seasonal usage variations

### Compliance Check
- Verify compliance with security policies
- Review audit logs
- Ensure data protection measures are effective

## Incident Response

### Application Not Responding
1. Check pod status:
   ```bash
   kubectl get pods -n greenops
   ```

2. Check pod logs:
   ```bash
   kubectl logs -n greenops <pod-name>
   ```

3. Check service status:
   ```bash
   kubectl get services -n greenops
   ```

4. Restart pods if necessary:
   ```bash
   kubectl delete pod -n greenops <pod-name>
   ```

### Database Connectivity Issues
1. Verify Supabase credentials in environment variables
2. Check network connectivity to Supabase
3. Review Supabase service status
4. Contact Supabase support if issues persist

### Metrics Collection Failures
1. Check Prometheus connectivity:
   ```bash
   curl http://prometheus:9090/-/healthy
   ```

2. Verify Prometheus URL in configuration
3. Check Prometheus service status
4. Review metrics collection logs

### AI Recommendation Failures
1. Check AI provider connectivity:
   ```bash
   curl http://ollama:11434/api/tags
   ```

2. Verify AI provider credentials
3. Check model availability
4. Review AI service logs

## Disaster Recovery

### Partial Outage Recovery
1. Identify affected components
2. Isolate the issue
3. Apply targeted fixes
4. Verify recovery

### Complete Outage Recovery
1. Execute disaster recovery script:
   ```bash
   ./scripts/disaster-recovery.sh
   ```

2. Verify application functionality
3. Restore data from backups if necessary
4. Update DNS records if needed

## Scaling Operations

### Horizontal Scaling
```bash
# Scale backend deployment
kubectl scale deployment greenops-backend -n greenops --replicas=3

# Scale frontend deployment
kubectl scale deployment greenops-frontend -n greenops --replicas=3
```

### Vertical Scaling
1. Edit deployment resources:
   ```bash
   kubectl edit deployment greenops-backend -n greenops
   ```

2. Update resource requests and limits
3. Apply changes

## Maintenance Windows

### Scheduled Maintenance
1. Announce maintenance window
2. Scale down applications if necessary
3. Perform maintenance tasks
4. Scale up applications
5. Verify functionality
6. Announce maintenance completion

### Emergency Maintenance
1. Assess impact and urgency
2. Notify stakeholders
3. Implement fixes
4. Verify recovery
5. Document incident

## Troubleshooting

### Common Issues and Solutions

#### Issue: High CPU Usage
- Solution: Check for infinite loops in code, optimize database queries, add more replicas

#### Issue: Memory Leaks
- Solution: Review code for proper resource cleanup, restart pods, investigate with profiling tools

#### Issue: Slow API Responses
- Solution: Check database performance, optimize queries, add indexes, review caching

#### Issue: Authentication Failures
- Solution: Verify credentials, check token expiration, review authentication configuration

## Contact Information

### Support Team
- Primary: devops-team@company.com
- Secondary: oncall@company.com

### Vendor Contacts
- Supabase Support: support@supabase.com
- Kubernetes Community: community@kubernetes.io