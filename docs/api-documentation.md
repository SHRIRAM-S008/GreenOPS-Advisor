# API Documentation

## Overview

This document provides detailed information about the GreenOps Advisor REST API endpoints.

## Authentication

Most API endpoints require authentication through Supabase. Include your Supabase API key in the `Authorization` header:

```
Authorization: Bearer YOUR_SUPABASE_KEY
```

## Base URL

```
http://localhost:7860/api/v1
```

## Health and Information

### Get API Information
```
GET /
```

Returns information about the API.

**Response:**
```json
{
  "name": "GreenOps Advisor API",
  "version": "1.0.0",
  "description": "AI-Powered Kubernetes Cost & Carbon Optimization"
}
```

### Health Check
```
GET /health
```

Returns the health status of the application.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00Z",
  "components": {
    "database": "healthy",
    "prometheus": "healthy",
    "ai_service": "healthy"
  }
}
```

## Metrics Collection

### Collect Metrics
```
POST /collect_metrics
```

Triggers collection of metrics from Kubernetes cluster.

**Request Body:**
```json
{
  "cluster_name": "my-cluster",
  "force": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Metrics collection started",
  "job_id": "abc123"
}
```

### Get Collection Status
```
GET /collect_metrics/status/{job_id}
```

Returns the status of a metrics collection job.

**Response:**
```json
{
  "job_id": "abc123",
  "status": "completed",
  "started_at": "2023-01-01T00:00:00Z",
  "completed_at": "2023-01-01T00:05:00Z",
  "metrics_collected": 1250
}
```

## Workloads

### List Workloads
```
GET /workloads
```

Returns a list of all workloads in the cluster.

**Query Parameters:**
- `cluster_name` (optional): Filter by cluster
- `namespace` (optional): Filter by namespace
- `type` (optional): Filter by workload type (deployment, statefulset, daemonset, etc.)

**Response:**
```json
{
  "workloads": [
    {
      "id": "workload-1",
      "name": "my-app",
      "namespace": "default",
      "type": "deployment",
      "cluster_name": "my-cluster",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### Get Workload Details
```
GET /workloads/{workload_id}
```

Returns detailed information about a specific workload.

**Response:**
```json
{
  "id": "workload-1",
  "name": "my-app",
  "namespace": "default",
  "type": "deployment",
  "cluster_name": "my-cluster",
  "containers": [
    {
      "name": "app",
      "image": "nginx:latest",
      "resources": {
        "requests": {
          "cpu": "100m",
          "memory": "128Mi"
        },
        "limits": {
          "cpu": "200m",
          "memory": "256Mi"
        }
      }
    }
  ],
  "created_at": "2023-01-01T00:00:00Z"
}
```

## Opportunities

### List Opportunities
```
GET /opportunities
```

Returns a list of identified optimization opportunities.

**Query Parameters:**
- `cluster_name` (optional): Filter by cluster
- `namespace` (optional): Filter by namespace
- `type` (optional): Filter by opportunity type
- `status` (optional): Filter by status (open, applied, dismissed)

**Response:**
```json
{
  "opportunities": [
    {
      "id": "opp-1",
      "workload_id": "workload-1",
      "type": "resource_right-sizing",
      "title": "CPU Request Optimization",
      "description": "Reduce CPU request from 200m to 100m",
      "confidence": 0.85,
      "estimated_savings": {
        "monthly_cost": 25.50,
        "carbon_reduction": 12.5
      },
      "status": "open",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### Get Opportunity Details
```
GET /opportunities/{opportunity_id}
```

Returns detailed information about a specific opportunity.

**Response:**
```json
{
  "id": "opp-1",
  "workload_id": "workload-1",
  "type": "resource_right-sizing",
  "title": "CPU Request Optimization",
  "description": "Reduce CPU request from 200m to 100m",
  "confidence": 0.85,
  "estimated_savings": {
    "monthly_cost": 25.50,
    "carbon_reduction": 12.5
  },
  "current_config": {
    "cpu_request": "200m",
    "memory_request": "512Mi"
  },
  "recommended_config": {
    "cpu_request": "100m",
    "memory_request": "256Mi"
  },
  "status": "open",
  "created_at": "2023-01-01T00:00:00Z"
}
```

### Dismiss Opportunity
```
POST /opportunities/{opportunity_id}/dismiss
```

Dismisses an opportunity.

**Response:**
```json
{
  "status": "success",
  "message": "Opportunity dismissed"
}
```

## Recommendations

### Get AI Recommendations
```
GET /recommendations/{workload_id}
```

Returns AI-generated recommendations for a specific workload.

**Response:**
```json
{
  "workload_id": "workload-1",
  "recommendations": [
    {
      "id": "rec-1",
      "type": "resource_optimization",
      "title": "Resource Right-Sizing",
      "description": "Based on usage patterns, we recommend reducing CPU requests...",
      "confidence": 0.92,
      "patch": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  template:\n    spec:\n      containers:\n      - name: app\n        resources:\n          requests:\n            cpu: 100m\n            memory: 256Mi",
      "estimated_savings": {
        "monthly_cost": 30.00,
        "carbon_reduction": 15.0
      }
    }
  ]
}
```

### Apply Recommendation
```
POST /recommendations/{workload_id}/apply
```

Applies an AI recommendation to the workload.

**Request Body:**
```json
{
  "recommendation_id": "rec-1"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Recommendation applied successfully",
  "patch_result": {
    "success": true,
    "message": "Deployment updated"
  }
}
```

## Clusters

### List Clusters
```
GET /clusters
```

Returns a list of managed clusters.

**Response:**
```json
{
  "clusters": [
    {
      "name": "my-cluster",
      "status": "active",
      "version": "v1.24.0",
      "node_count": 3,
      "last_seen": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### Get Cluster Details
```
GET /clusters/{cluster_name}
```

Returns detailed information about a specific cluster.

**Response:**
```json
{
  "name": "my-cluster",
  "status": "active",
  "version": "v1.24.0",
  "node_count": 3,
  "nodes": [
    {
      "name": "node-1",
      "role": "worker",
      "cpu_capacity": "4",
      "memory_capacity": "8Gi",
      "cpu_usage": "1.2",
      "memory_usage": "3.5Gi"
    }
  ],
  "last_seen": "2023-01-01T00:00:00Z"
}
```

## GitHub Integration

### Process GitHub Webhook
```
POST /github/webhook
```

Processes GitHub webhook events for PR analysis.

**Headers:**
- `X-GitHub-Event`: Type of GitHub event
- `X-Hub-Signature-256`: Webhook signature for validation

**Response:**
```json
{
  "status": "success",
  "message": "Webhook processed"
}
```

## Real-time Updates

### WebSocket Connection
```
WebSocket /ws/metrics
```

Establishes a WebSocket connection for real-time metrics updates.

**Events:**
- `metrics_update`: New metrics data
- `opportunity_created`: New optimization opportunity
- `recommendation_generated`: New AI recommendation

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

**404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

Exceeding these limits will result in a 429 Too Many Requests response.

## Versioning

The API is versioned to ensure backward compatibility. The current version is v1.

## Changelog

### v1.0.0
- Initial release
- Core metrics collection and analysis
- AI-powered recommendations
- GitHub integration
- Real-time updates

## Support

For API support, contact:
- API Support: api-support@greenops-advisor.com
- Documentation: https://docs.greenops-advisor.com/api