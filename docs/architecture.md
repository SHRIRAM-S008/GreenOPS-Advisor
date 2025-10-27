# GreenOps Advisor Architecture

## Overview

GreenOps Advisor is an AI-powered Kubernetes cost and carbon optimization platform that analyzes workloads and provides actionable recommendations to reduce resource consumption and environmental impact.

## System Components

### 1. Frontend (Next.js)
- **Technology**: React with Next.js
- **Purpose**: User interface for viewing metrics, opportunities, and applying fixes
- **Features**:
  - Real-time dashboard with metrics visualization
  - Opportunity listing with cost and carbon impact
  - Apply Fix functionality for automated remediation
  - Multi-cluster support

### 2. Backend (FastAPI)
- **Technology**: Python with FastAPI
- **Purpose**: Core logic for metrics collection, analysis, and AI integration
- **Features**:
  - Kubernetes API integration
  - Metrics collection from Prometheus and Kepler
  - AI-powered recommendation engine
  - GitHub webhook processing
  - REST API for frontend communication

### 3. Database (Supabase)
- **Technology**: PostgreSQL with Supabase
- **Purpose**: Persistent storage for metrics, opportunities, and recommendations
- **Schema**:
  - Metrics table for resource consumption data
  - Opportunities table for identified optimization suggestions
  - Recommendations table for AI-generated fixes

### 4. Monitoring Stack
- **Prometheus**: Resource metrics collection
- **Kepler**: Energy consumption monitoring
- **OpenCost**: Cost allocation and attribution

### 5. AI Providers
- **Ollama**: Local AI model hosting
- **OpenAI**: Cloud-based AI models
- **Anthropic**: Claude AI models

## Data Flow

1. **Metrics Collection**:
   - Backend periodically collects metrics from Prometheus and Kepler
   - Data is stored in Supabase database
   - Real-time updates are pushed to frontend via WebSockets

2. **Analysis**:
   - Backend analyzes metrics to identify optimization opportunities
   - AI models generate specific recommendations for each opportunity
   - Results are stored in database

3. **Presentation**:
   - Frontend fetches opportunities and recommendations from backend
   - Data is visualized in dashboard
   - Users can apply fixes directly from UI

4. **Automation**:
   - GitHub webhook integration for PR analysis
   - Automated PR creation with optimization suggestions
   - Real-time feedback on cost and carbon impact

## Security Architecture

### Authentication
- Supabase authentication for user management
- GitHub App authentication for webhook integration
- API key authentication for service-to-service communication

### Authorization
- Role-based access control (RBAC)
- Namespace-level permissions for Kubernetes operations
- Cluster-level access controls

### Data Protection
- Encryption at rest for database storage
- TLS encryption for all network communication
- Secure handling of credentials and secrets

## Scalability

### Horizontal Scaling
- Stateless backend services for easy scaling
- Database connection pooling
- Load balancing for frontend services

### Multi-Cluster Support
- Centralized management of multiple Kubernetes clusters
- Cluster-specific configuration and analysis
- Aggregated reporting across all clusters

## High Availability

### Redundancy
- Multiple replicas for backend and frontend services
- Database replication and failover
- Load balancer for traffic distribution

### Monitoring
- Health checks for all services
- Alerting for system failures
- Performance monitoring and optimization

## Disaster Recovery

### Backup Strategy
- Daily backups of database and configuration
- Version-controlled infrastructure as code
- Automated backup verification

### Recovery Process
- Documented recovery procedures
- Automated recovery scripts
- Regular disaster recovery testing