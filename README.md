# GreenOps Advisor

AI-Powered Kubernetes Cost & Carbon Optimization

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (minikube, kind, or cloud provider)
- kubectl CLI

## Building and Running with Docker

### 1. Build the Docker Images

```bash
# Build backend service
docker build -t greenops-advisor-backend ./backend

# Build frontend service
docker build -t greenops-advisor-frontend ./frontend
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 3. Access the Application

- Frontend Dashboard: http://localhost:3000
- Backend API: http://localhost:7860

## Environment Variables

Make sure to set the required environment variables in:
- `backend/.env` - For backend services
- `frontend/.env.local` - For frontend configuration

### Backend Environment Variables

```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Optional but recommended
PROMETHEUS_URL=http://prometheus:9090
OPENCOST_URL=http://opencost:9003
KEPLER_URL=http://kepler:8081
OLLAMA_URL=http://ollama:11434

# For GitHub integration
GITHUB_TOKEN=your_github_token
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key

# For container registry integration
DOCKER_HUB_USERNAME=your_docker_hub_username
DOCKER_HUB_TOKEN=your_docker_hub_token

# Configuration
CLUSTER_NAME=minikube-demo
CARBON_INTENSITY_G_PER_KWH=475
IMAGE_SIZE_THRESHOLD_MB=200
```

### Frontend Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## New Features

### 1. Image Optimization Analysis
- Analyzes container image sizes using Docker Hub API and GitHub Container Registry API
- Recommends smaller base images or multi-stage builds
- Estimates cost and carbon savings from image optimization
- Requires Docker Hub or GitHub credentials for accurate sizing

### 2. Advanced Scheduling Analysis
- Recommends node selectors and taint tolerations
- Identifies batch jobs that could be converted to CronJobs
- Suggests resource scheduling optimizations

### 3. GitHub PR Automation
- Automatically creates PRs with optimization suggestions
- Comments on existing PRs with cost/carbon impact analysis
- Supports multiple AI providers (Ollama, OpenAI, Anthropic)

### 4. Modular AI Provider Support
- Supports multiple AI providers: Ollama, OpenAI, Anthropic
- Configurable through environment variables
- Fallback mechanisms for when AI services are unavailable

### 5. Real-time Metrics Updates
- WebSocket-based real-time metrics dashboard
- Live updates of metrics collection and processing
- Connection status monitoring

### 6. Security Analysis
- Identifies security best practices violations
- Recommends securityContext configurations
- Flags privileged containers and hostPath volumes

### 7. Multi-Cluster Support
- Manage and analyze multiple Kubernetes clusters
- Cluster-specific metrics and recommendations
- Centralized dashboard for all clusters

### 8. Predictive Analytics
- Predicts future resource usage based on historical data
- Provides capacity planning recommendations
- Calculates confidence intervals for predictions

## Container Registry Integration

The GreenOps Advisor now supports accurate image size analysis through integration with container registries:

### Supported Registries
1. **Docker Hub** - Public and private repositories
2. **GitHub Container Registry (GHCR)** - GitHub package registry
3. **Kubernetes Fallback** - Inspection through kubelet (limited)

### Configuration
To enable accurate image size analysis, configure the appropriate credentials:

#### Docker Hub
```bash
DOCKER_HUB_USERNAME=your_username
DOCKER_HUB_TOKEN=your_access_token
```

#### GitHub Container Registry
```bash
GITHUB_TOKEN=your_github_token
```

### Benefits
- Accurate image size measurements for optimization recommendations
- Better cost and carbon savings estimates
- Improved confidence scores for image optimization opportunities

## Development

### Backend Development

```bash
cd backend
# Activate virtual environment
source venv/bin/activate
# Run development server
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
# Run development server
npm run dev
```

## Services Overview

1. **Backend API** (Port 7860)
   - FastAPI application
   - Connects to Supabase, Prometheus, Kepler, and Ollama
   - Provides REST API for metrics collection and analysis

2. **Frontend Dashboard** (Port 3000)
   - Next.js React application
   - Displays optimization opportunities
   - Interactive charts and recommendations

3. **Monitoring Services**
   - Prometheus: Resource metrics collection
   - Kepler: Energy consumption monitoring
   - Ollama: AI model for recommendations

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `POST /collect_metrics` - Collect metrics from Kubernetes cluster
- `POST /analyze` - Analyze collected metrics for optimization opportunities
- `GET /opportunities` - Retrieve identified optimization opportunities
- `GET /recommendations/{workload_id}` - Get AI-powered recommendations for specific workloads
- `GET /ws/metrics` - WebSocket endpoint for real-time metrics

## Deployment

### GitHub Deployment

The code is hosted on GitHub at: https://github.com/SHRIRAM-S008/GreenOPS-Advisor

### Vercel Deployment

The frontend is deployed on Vercel at: https://frontend-8leoc6c3w-shriram-s008s-projects.vercel.app

## GitHub App Integration

To set up the GitHub App webhook integration:

1. Create a GitHub App with the webhook URL pointing to your backend API
2. Update the webhook secret in `backend/.env`
3. Add the private key file to `backend/`

## License

MIT