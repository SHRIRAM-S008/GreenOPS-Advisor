from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from prometheus_api_client import PrometheusConnect
from kubernetes import client, config
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import requests
import logging
from github import Github, GithubIntegration
import hmac
import hashlib

# Import the AI advisor module
from ai_advisor import generate_recommendation, generate_yaml_patch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="GreenOps Advisor API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

prom = PrometheusConnect(url=os.getenv("PROMETHEUS_URL"), disable_ssl=True)

# Initialize GitHub integration
GITHUB_APP_ID = os.getenv("GITHUB_APP_ID")
GITHUB_PRIVATE_KEY = ""
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")

if GITHUB_APP_ID and os.getenv("GITHUB_PRIVATE_KEY_PATH"):
    private_key_path = os.getenv("GITHUB_PRIVATE_KEY_PATH")
    if private_key_path and os.path.exists(private_key_path):
        with open(private_key_path, 'r') as key_file:
            GITHUB_PRIVATE_KEY = key_file.read()
        integration = GithubIntegration(GITHUB_APP_ID, GITHUB_PRIVATE_KEY)
    else:
        integration = None
else:
    integration = None

try:
    config.load_kube_config()  # Load from ~/.kube/config
except:
    config.load_incluster_config()  # Load from service account

k8s_apps = client.AppsV1Api()
k8s_core = client.CoreV1Api()

CLUSTER_NAME = os.getenv("CLUSTER_NAME", "minikube-demo")
CARBON_INTENSITY = float(os.getenv("CARBON_INTENSITY_G_PER_KWH", "475"))

# ========== UTILITY FUNCTIONS ==========

def get_or_create_cluster():
    """Get or create cluster record in Supabase"""
    result = supabase.table("clusters").select("*").eq("name", CLUSTER_NAME).execute()
    if result.data:
        return result.data[0]["id"]
    
    result = supabase.table("clusters").insert({
        "name": CLUSTER_NAME,
        "provider": "local",
        "region": "us-west-1"
    }).execute()
    return result.data[0]["id"]

def get_or_create_namespace(cluster_id, namespace_name):
    """Get or create namespace record"""
    result = supabase.table("namespaces").select("*").eq("cluster_id", cluster_id).eq("name", namespace_name).execute()
    if result.data:
        return result.data[0]["id"]
    
    result = supabase.table("namespaces").insert({
        "cluster_id": cluster_id,
        "name": namespace_name
    }).execute()
    return result.data[0]["id"]

def get_or_create_workload(namespace_id, name, kind, replicas):
    """Get or create workload record"""
    result = supabase.table("workloads").select("*").eq("namespace_id", namespace_id).eq("name", name).eq("kind", kind).execute()
    if result.data:
        # Update replicas if changed
        supabase.table("workloads").update({"replicas": replicas}).eq("id", result.data[0]["id"]).execute()
        return result.data[0]["id"]
    
    result = supabase.table("workloads").insert({
        "namespace_id": namespace_id,
        "name": name,
        "kind": kind,
        "replicas": replicas
    }).execute()
    return result.data[0]["id"]

# ========== API ENDPOINTS ==========

@app.get("/")
async def root():
    return {
        "message": "GreenOps Advisor API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "collect": "/collect_metrics",
            "analyze": "/analyze",
            "opportunities": "/opportunities",
            "recommendations": "/recommendations/{workload_id}"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    checks = {
        "api": "healthy",
        "supabase": "unknown",
        "prometheus": "unknown",
        "kubernetes": "unknown"
    }
    
    # Check Supabase
    try:
        supabase.table("clusters").select("count").execute()
        checks["supabase"] = "healthy"
    except Exception as e:
        checks["supabase"] = f"error: {str(e)}"
    
    # Check Prometheus
    try:
        prom.check_prometheus_connection()
        checks["prometheus"] = "healthy"
    except Exception as e:
        checks["prometheus"] = f"error: {str(e)}"
    
    # Check Kubernetes
    try:
        k8s_core.list_namespace()
        checks["kubernetes"] = "healthy"
    except Exception as e:
        checks["kubernetes"] = f"error: {str(e)}"
    
    return checks

@app.post("/collect_metrics")
async def collect_metrics():
    """Collect metrics from Kubernetes, Prometheus, OpenCost, and Kepler"""
    logger.info("Starting metrics collection...")
    
    cluster_id = get_or_create_cluster()
    collected_count = 0
    
    try:
        # Get all namespaces
        namespaces = k8s_core.list_namespace()
        
        for ns in namespaces.items:
            ns_name = ns.metadata.name
            
            # Skip system namespaces (optional)
            if ns_name in ["kube-system", "kube-public", "kube-node-lease"]:
                continue
            
            namespace_id = get_or_create_namespace(cluster_id, ns_name)
            
            # Get deployments
            deployments = k8s_apps.list_namespaced_deployment(ns_name)
            for deploy in deployments.items:
                workload_id = get_or_create_workload(
                    namespace_id,
                    deploy.metadata.name,
                    "Deployment",
                    deploy.spec.replicas
                )
                
                # Collect cost metrics from OpenCost
                try:
                    opencost_query = f'sum(container_cpu_allocation{{namespace="{ns_name}",pod=~"{deploy.metadata.name}.*"}}) * 0.02'  # $0.02 per CPU hour
                    cpu_cost_result = prom.custom_query(opencost_query)
                    cpu_cost = float(cpu_cost_result[0]["value"][1]) if cpu_cost_result else 0.0
                    
                    memory_cost_query = f'sum(container_memory_allocation_bytes{{namespace="{ns_name}",pod=~"{deploy.metadata.name}.*"}}) / 1024 / 1024 / 1024 * 0.005'  # $0.005 per GB hour
                    memory_cost_result = prom.custom_query(memory_cost_query)
                    memory_cost = float(memory_cost_result[0]["value"][1]) if memory_cost_result else 0.0
                    
                    # Get resource requests and usage
                    cpu_req_query = f'sum(kube_pod_container_resource_requests{{namespace="{ns_name}",pod=~"{deploy.metadata.name}.*",resource="cpu"}})'
                    cpu_req_result = prom.custom_query(cpu_req_query)
                    cpu_requested = float(cpu_req_result[0]["value"][1]) if cpu_req_result else 0.0
                    
                    cpu_usage_query = f'sum(rate(container_cpu_usage_seconds_total{{namespace="{ns_name}",pod=~"{deploy.metadata.name}.*"}}[5m]))'
                    cpu_usage_result = prom.custom_query(cpu_usage_query)
                    cpu_used = float(cpu_usage_result[0]["value"][1]) if cpu_usage_result else 0.0
                    
                    mem_req_query = f'sum(kube_pod_container_resource_requests{{namespace="{ns_name}",pod=~"{deploy.metadata.name}.*",resource="memory"}}) / 1024 / 1024 / 1024'
                    mem_req_result = prom.custom_query(mem_req_query)
                    memory_requested = float(mem_req_result[0]["value"][1]) if mem_req_result else 0.0
                    
                    mem_usage_query = f'sum(container_memory_usage_bytes{{namespace="{ns_name}",pod=~"{deploy.metadata.name}.*"}}) / 1024 / 1024 / 1024'
                    mem_usage_result = prom.custom_query(mem_usage_query)
                    memory_used = float(mem_usage_result[0]["value"][1]) if mem_usage_result else 0.0
                    
                    # Insert cost metrics
                    supabase.table("cost_metrics").insert({
                        "workload_id": workload_id,
                        "cpu_cost_usd": cpu_cost,
                        "memory_cost_usd": memory_cost,
                        "storage_cost_usd": 0.0,
                        "total_cost_usd": cpu_cost + memory_cost,
                        "cpu_cores_requested": cpu_requested,
                        "cpu_cores_used": cpu_used,
                        "memory_gb_requested": memory_requested,
                        "memory_gb_used": memory_used
                    }).execute()
                    
                except Exception as e:
                    logger.error(f"Error collecting cost metrics for {deploy.metadata.name}: {str(e)}")
                
                # Collect energy metrics from Kepler
                try:
                    energy_query = f'sum(kepler_container_joules_total{{namespace="{ns_name}",pod_name=~"{deploy.metadata.name}.*"}})'
                    energy_result = prom.custom_query(energy_query)
                    energy_joules = float(energy_result[0]["value"][1]) if energy_result else 0.0
                    
                    # Convert joules to kWh and calculate carbon
                    energy_kwh = energy_joules / 3600000  # 1 kWh = 3,600,000 joules
                    carbon_gco2e = energy_kwh * CARBON_INTENSITY
                    
                    power_watts = energy_joules / 3600  # Average power over 1 hour
                    
                    # Insert energy metrics
                    supabase.table("energy_metrics").insert({
                        "workload_id": workload_id,
                        "energy_joules": energy_joules,
                        "carbon_gco2e": carbon_gco2e,
                        "power_watts": power_watts
                    }).execute()
                    
                except Exception as e:
                    logger.error(f"Error collecting energy metrics for {deploy.metadata.name}: {str(e)}")
                
                collected_count += 1
        
        logger.info(f"Metrics collection complete. Collected data for {collected_count} workloads.")
        return {
            "status": "success",
            "workloads_processed": collected_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error during metrics collection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_opportunities():
    """Analyze collected metrics and identify savings opportunities"""
    logger.info("Starting opportunity analysis...")
    
    try:
        # Get all workloads
        workloads_result = supabase.table("workloads").select("*").execute()
        opportunities_created = 0
        
        for workload in workloads_result.data:
            workload_id = workload["id"]
            
            # Get recent cost metrics (last 24 hours)
            cost_metrics = supabase.table("cost_metrics") \
                .select("*") \
                .eq("workload_id", workload_id) \
                .gte("timestamp", (datetime.now() - timedelta(hours=24)).isoformat()) \
                .execute()
            
            if not cost_metrics.data:
                continue
            
            # Calculate averages
            avg_cpu_requested = sum(m["cpu_cores_requested"] for m in cost_metrics.data) / len(cost_metrics.data)
            avg_cpu_used = sum(m["cpu_cores_used"] for m in cost_metrics.data) / len(cost_metrics.data)
            avg_memory_requested = sum(m["memory_gb_requested"] for m in cost_metrics.data) / len(cost_metrics.data)
            avg_memory_used = sum(m["memory_gb_used"] for m in cost_metrics.data) / len(cost_metrics.data)
            avg_total_cost = sum(m["total_cost_usd"] for m in cost_metrics.data) / len(cost_metrics.data)
            
            # Get energy metrics
            energy_metrics = supabase.table("energy_metrics") \
                .select("*") \
                .eq("workload_id", workload_id) \
                .gte("timestamp", (datetime.now() - timedelta(hours=24)).isoformat()) \
                .execute()
            
            avg_carbon = sum(m["carbon_gco2e"] for m in energy_metrics.data) / len(energy_metrics.data) if energy_metrics.data else 0
            
            # Identify rightsizing opportunity
            cpu_utilization = (avg_cpu_used / avg_cpu_requested) * 100 if avg_cpu_requested > 0 else 0
            memory_utilization = (avg_memory_used / avg_memory_requested) * 100 if avg_memory_requested > 0 else 0
            
            if cpu_utilization < 20 or memory_utilization < 20:
                # Calculate recommended values (2x peak usage with 20% buffer)
                recommended_cpu = avg_cpu_used * 2 * 1.2
                recommended_memory = avg_memory_used * 2 * 1.2
                
                # Calculate projected savings
                cpu_reduction_ratio = recommended_cpu / avg_cpu_requested if avg_cpu_requested > 0 else 1
                projected_cost = avg_total_cost * cpu_reduction_ratio
                savings = avg_total_cost - projected_cost
                
                carbon_reduction_ratio = cpu_reduction_ratio  # Simplified assumption
                projected_carbon = avg_carbon * carbon_reduction_ratio
                carbon_savings = avg_carbon - projected_carbon
                
                # Determine risk level
                if cpu_utilization < 10 or memory_utilization < 10:
                    risk_level = "low"
                    confidence = 0.9
                elif cpu_utilization < 15 or memory_utilization < 15:
                    risk_level = "medium"
                    confidence = 0.75
                else:
                    risk_level = "medium"
                    confidence = 0.6
                
                explanation = f"Workload is underutilized. CPU: {cpu_utilization:.1f}%, Memory: {memory_utilization:.1f}%. Rightsizing can save ${savings*24*30:.2f}/month."
                
                # Create opportunity
                supabase.table("opportunities").insert({
                    "workload_id": workload_id,
                    "opportunity_type": "rightsizing",
                    "status": "pending",
                    "current_cost_usd": avg_total_cost * 24 * 30,  # Monthly cost
                    "projected_cost_usd": projected_cost * 24 * 30,
                    "savings_usd": savings * 24 * 30,
                    "current_carbon_gco2e": avg_carbon * 24 * 30,
                    "projected_carbon_gco2e": projected_carbon * 24 * 30,
                    "carbon_reduction_gco2e": carbon_savings * 24 * 30,
                    "confidence_score": confidence,
                    "risk_level": risk_level,
                    "explanation": explanation,
                    "ai_reasoning": f"Based on 24h analysis: avg CPU {avg_cpu_used:.3f}/{avg_cpu_requested:.3f} cores ({cpu_utilization:.1f}%), avg Memory {avg_memory_used:.3f}/{avg_memory_requested:.3f} GB ({memory_utilization:.1f}%)"
                }).execute()
                
                opportunities_created += 1
        
        logger.info(f"Analysis complete. Created {opportunities_created} opportunities.")
        return {
            "status": "success",
            "opportunities_created": opportunities_created,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/opportunities")
async def get_opportunities(status: str | None = None, limit: int = 50):
    """Get all opportunities, optionally filtered by status"""
    try:
        query = supabase.table("opportunities") \
            .select("*, workloads(name, kind, namespaces(name))") \
            .order("savings_usd", desc=True) \
            .limit(limit)
        
        if status:
            query = query.eq("status", status)
        
        result = query.execute()
        return {
            "count": len(result.data),
            "opportunities": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommendations/{workload_id}")
async def get_workload_recommendations(workload_id: str):
    """Get AI-powered recommendations for a specific workload"""
    try:
        # Get workload details
        workload = supabase.table("workloads").select("*, namespaces(name, clusters(name))").eq("id", workload_id).execute()
        if not workload.data:
            raise HTTPException(status_code=404, detail="Workload not found")
        
        # Get recent metrics
        cost_metrics = supabase.table("cost_metrics").select("*").eq("workload_id", workload_id).order("timestamp", desc=True).limit(100).execute()
        energy_metrics = supabase.table("energy_metrics").select("*").eq("workload_id", workload_id).order("timestamp", desc=True).limit(100).execute()
        
        if not cost_metrics.data:
            raise HTTPException(status_code=404, detail="No metrics found for workload")
        
        # Calculate averages
        avg_cpu_requested = sum(m["cpu_cores_requested"] for m in cost_metrics.data) / len(cost_metrics.data)
        avg_cpu_used = sum(m["cpu_cores_used"] for m in cost_metrics.data) / len(cost_metrics.data)
        avg_memory_requested = sum(m["memory_gb_requested"] for m in cost_metrics.data) / len(cost_metrics.data)
        avg_memory_used = sum(m["memory_gb_used"] for m in cost_metrics.data) / len(cost_metrics.data)
        avg_cost = sum(m["total_cost_usd"] for m in cost_metrics.data) / len(cost_metrics.data)
        avg_carbon = sum(m["carbon_gco2e"] for m in energy_metrics.data) / len(energy_metrics.data) if energy_metrics.data else 0
        
        cpu_utilization = (avg_cpu_used / avg_cpu_requested * 100) if avg_cpu_requested > 0 else 0
        memory_utilization = (avg_memory_used / avg_memory_requested * 100) if avg_memory_requested > 0 else 0
        
        # Prepare data for AI
        workload_data = {
            "name": workload.data[0]["name"],
            "kind": workload.data[0]["kind"],
            "namespace": workload.data[0]["namespaces"]["name"],
            "cpu_requested": avg_cpu_requested,
            "cpu_used": avg_cpu_used,
            "cpu_utilization": cpu_utilization,
            "memory_requested": avg_memory_requested,
            "memory_used": avg_memory_used,
            "memory_utilization": memory_utilization,
            "current_cost": avg_cost * 24 * 30,  # Monthly
            "current_carbon": avg_carbon * 24 * 30
        }
        
        # Generate AI recommendation
        recommendation = generate_recommendation(workload_data)
        
        # Generate YAML patch
        yaml_patch = generate_yaml_patch(workload_data, recommendation)
        
        return {
            "workload": workload_data,
            "recommendation": recommendation,
            "yaml_patch": yaml_patch,
            "apply_command": f"kubectl apply -f patch.yaml -n {workload_data['namespace']}"
        }
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def verify_github_signature(payload_body: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature"""
    if not signature:
        return False
    
    hash_object = hmac.new(
        GITHUB_WEBHOOK_SECRET.encode('utf-8'),
        msg=payload_body,
        digestmod=hashlib.sha256
    )
    expected_signature = "sha256=" + hash_object.hexdigest()
    return hmac.compare_digest(expected_signature, signature)

@app.post("/github_webhook")
async def github_webhook(request: Request):
    """Handle GitHub webhook events"""
    try:
        # Get signature
        signature = request.headers.get("X-Hub-Signature-256")
        payload_body = await request.body()
        
        # Verify signature
        if not verify_github_signature(payload_body, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse payload
        payload = await request.json()
        event_type = request.headers.get("X-GitHub-Event")
        
        logger.info(f"Received GitHub event: {event_type}")
        
        if event_type == "pull_request" and payload.get("action") in ["opened", "synchronize"]:
            # Check if GitHub integration is configured
            if integration is None:
                logger.warning("GitHub integration not configured")
                return {"status": "processed", "message": "GitHub integration not configured"}
            
            # Get installation access token
            installation_id = payload["installation"]["id"]
            access_token = integration.get_access_token(installation_id).token
            g = Github(access_token)
            
            # Get PR info
            repo_name = payload["repository"]["full_name"]
            pr_number = payload["pull_request"]["number"]
            
            repo = g.get_repo(repo_name)
            pr = repo.get_pull(pr_number)
            
            # Analyze PR changes
            changed_files = pr.get_files()
            yaml_changes = []
            
            for file in changed_files:
                if file.filename.endswith(('.yaml', '.yml')):
                    yaml_changes.append(file.filename)
            
            if yaml_changes:
                # Simple analysis (expand with actual resource parsing)
                comment = f"""
## 🌿 GreenOps Advisor Analysis

This PR modifies Kubernetes manifests:
{chr(10).join([f'- `{f}`' for f in yaml_changes])}

### Estimated Impact
- **Cost Change**: TBD (analyzing...)
- **Carbon Impact**: TBD (analyzing...)
- **Risk Level**: Medium

*Full analysis will be available in 2-3 minutes.*

---
*Powered by GreenOps Advisor | [Learn More](https://github.com/yourusername/greenops-advisor)*
"""
                pr.create_issue_comment(comment)
                
                # Store PR event
                supabase.table("pr_events").insert({
                    "repo_full_name": repo_name,
                    "pr_number": pr_number,
                    "pr_url": pr.html_url,
                    "delta_cost_usd": 0,  # Calculate actual impact
                    "delta_carbon_gco2e": 0,
                    "risk_assessment": "Pending analysis",
                    "comment_url": pr.comments_url
                }).execute()
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== BACKGROUND TASKS ==========

@app.on_event("startup")
async def startup_event():
    """Run on API startup"""
    logger.info("GreenOps Advisor API started")
    logger.info(f"Prometheus URL: {os.getenv('PROMETHEUS_URL')}")
    logger.info(f"Supabase URL: {os.getenv('SUPABASE_URL')}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)