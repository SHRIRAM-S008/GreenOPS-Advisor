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