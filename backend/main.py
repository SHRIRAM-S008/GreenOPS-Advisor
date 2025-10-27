from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
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
import yaml
import base64
from typing import Dict, List, Any

# Import the AI advisor module
from ai_advisor import generate_recommendation, generate_yaml_patch
# Import utility functions
from utils import parse_cpu_to_cores, parse_mem_to_gb
# Import realtime metrics functions
import realtime_metrics
# Import configuration
from config import get_config
# Import registry functions
from registry import analyze_image_optimization_opportunities
# Import security analysis
from security import analyze_security
# Import cluster manager
from clusters import get_cluster_manager
# Import GitHub automation
from github_automation import get_github_automation
# Import AI provider
from ai_provider import get_ai_provider

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

# Initialize clients with proper error handling
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

if not PROMETHEUS_URL:
    raise ValueError("PROMETHEUS_URL must be set in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
prom = PrometheusConnect(url=PROMETHEUS_URL, disable_ssl=True)

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
k8s_batch = client.BatchV1Api()  # Add BatchV1Api for Jobs and CronJobs

CLUSTER_NAME = os.getenv("CLUSTER_NAME", "minikube-demo")
CARBON_INTENSITY = float(os.getenv("CARBON_INTENSITY_G_PER_KWH", "475"))

# ========== UTILITY FUNCTIONS ==========

def collect_workload_manifests(namespaces=None):
    """
    Collect all workload manifests from specified namespaces.
    
    Args:
        namespaces: List of namespaces to collect from. If None, collects from all namespaces.
        
    Returns:
        List of tuples containing (kind, namespace, name, workload_object)
    """
    workloads = []
    
    try:
        # If no namespaces specified, get all namespaces
        if namespaces is None:
            namespace_list = k8s_core.list_namespace()
            namespaces = [ns.metadata.name for ns in namespace_list.items]
        
        for ns_name in namespaces:
            # Skip system namespaces
            if ns_name in ["kube-system", "kube-public", "kube-node-lease"]:
                continue
            
            # Deployments
            try:
                deployments = k8s_apps.list_namespaced_deployment(ns_name)
                for deploy in deployments.items:
                    workloads.append(("Deployment", ns_name, deploy.metadata.name, deploy))
            except Exception as e:
                logger.error(f"Error collecting Deployments from namespace {ns_name}: {str(e)}")
            
            # StatefulSets
            try:
                statefulsets = k8s_apps.list_namespaced_stateful_set(ns_name)
                for sts in statefulsets.items:
                    workloads.append(("StatefulSet", ns_name, sts.metadata.name, sts))
            except Exception as e:
                logger.error(f"Error collecting StatefulSets from namespace {ns_name}: {str(e)}")
            
            # DaemonSets
            try:
                daemonsets = k8s_apps.list_namespaced_daemon_set(ns_name)
                for ds in daemonsets.items:
                    workloads.append(("DaemonSet", ns_name, ds.metadata.name, ds))
            except Exception as e:
                logger.error(f"Error collecting DaemonSets from namespace {ns_name}: {str(e)}")
            
            # Jobs
            try:
                jobs = k8s_batch.list_namespaced_job(ns_name)
                for job in jobs.items:
                    workloads.append(("Job", ns_name, job.metadata.name, job))
            except Exception as e:
                logger.error(f"Error collecting Jobs from namespace {ns_name}: {str(e)}")
            
            # CronJobs
            try:
                cronjobs = k8s_batch.list_namespaced_cron_job(ns_name)
                for cronjob in cronjobs.items:
                    workloads.append(("CronJob", ns_name, cronjob.metadata.name, cronjob))
            except Exception as e:
                logger.error(f"Error collecting CronJobs from namespace {ns_name}: {str(e)}")
                
    except Exception as e:
        logger.error(f"Error collecting workload manifests: {str(e)}")
    
    return workloads

# Cost model constants (align with OpenCost)
COST_PER_CPU_HOUR = 0.02   # USD per cpu core-hour (from collect_metrics function)
COST_PER_GB_HOUR = 0.005    # USD per GB-hour (from collect_metrics function)
HOURS_PER_MONTH = 24 * 30

# ========== ADDITIONAL UTILITY FUNCTIONS FOR GITHUB WEBHOOK ==========

def parse_resources_from_manifest(yaml_text: str) -> List[Dict[str, Any]]:
    """Parse Kubernetes manifest and extract workload specs with resource requests"""
    workloads = []
    try:
        docs = list(yaml.safe_load_all(yaml_text))
        for doc in docs:
            if not isinstance(doc, dict):
                continue
            kind = doc.get("kind")
            metadata = doc.get("metadata", {})
            spec = doc.get("spec", {})
            
            # Handle PodTemplate spec paths for Deployments, StatefulSets, etc.
            template = spec.get("template") or spec.get("jobTemplate", {}).get("spec", {}).get("template")
            if template:
                containers = template.get("spec", {}).get("containers", [])
            else:
                # Direct Pod manifest
                containers = spec.get("containers", [])
                
            for c in containers:
                name = c.get("name")
                res = c.get("resources", {})
                requests = res.get("requests", {})
                limits = res.get("limits", {})
                cpu_req = requests.get("cpu")
                mem_req = requests.get("memory")
                workloads.append({
                    "kind": kind,
                    "name": metadata.get("name"),
                    "container": name,
                    "cpu_request": cpu_req,
                    "mem_request": mem_req
                })
    except Exception as e:
        logger.error(f"Error parsing manifest: {str(e)}")
    return workloads

def get_file_content_from_github(g: Github, repo_name: str, file_path: str, ref: str) -> str:
    """Get file content from GitHub at specific ref"""
    try:
        repo = g.get_repo(repo_name)
        contents = repo.get_contents(file_path, ref=ref)
        # Check if contents is a list (directory) or single file
        if isinstance(contents, list):
            # If it's a list, get the first item (assuming it's the file we want)
            content_obj = contents[0] if contents else None
        else:
            content_obj = contents
            
        if content_obj and hasattr(content_obj, 'encoding') and content_obj.encoding == "base64":
            return base64.b64decode(content_obj.content).decode('utf-8')
        elif content_obj and hasattr(content_obj, 'content'):
            return content_obj.content
        return ""
    except Exception as e:
        logger.error(f"Error fetching file {file_path} from GitHub: {str(e)}")
        return ""

def get_or_create_cluster():
    """Get or create cluster record in Supabase"""
    result = supabase.table("clusters").select("*").eq("name", CLUSTER_NAME).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]["id"]
    
    result = supabase.table("clusters").insert({
        "name": CLUSTER_NAME,
        "provider": "local",
        "region": "us-west-1"
    }).execute()
    return result.data[0]["id"] if result.data and len(result.data) > 0 else None

def get_or_create_namespace(cluster_id, namespace_name):
    """Get or create namespace record"""
    result = supabase.table("namespaces").select("*").eq("cluster_id", cluster_id).eq("name", namespace_name).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]["id"]
    
    result = supabase.table("namespaces").insert({
        "cluster_id": cluster_id,
        "name": namespace_name
    }).execute()
    return result.data[0]["id"] if result.data and len(result.data) > 0 else None

def get_or_create_workload(namespace_id, name, kind, replicas):
    """Get or create workload record"""
    result = supabase.table("workloads").select("*").eq("namespace_id", namespace_id).eq("name", name).eq("kind", kind).execute()
    if result.data and len(result.data) > 0:
        # Update replicas if changed
        supabase.table("workloads").update({"replicas": replicas}).eq("id", result.data[0]["id"]).execute()
        return result.data[0]["id"]
    
    result = supabase.table("workloads").insert({
        "namespace_id": namespace_id,
        "name": name,
        "kind": kind,
        "replicas": replicas
    }).execute()
    return result.data[0]["id"] if result.data and len(result.data) > 0 else None

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
    """Collect cost and energy metrics from Prometheus and Kepler"""
    logger.info("Starting metrics collection...")
    
    cluster_id = get_or_create_cluster()
    collected_count = 0
    
    try:
        # Get all workloads using the new helper function
        workloads = collect_workload_manifests()
        
        for kind, ns_name, workload_name, workload_obj in workloads:
            namespace_id = get_or_create_namespace(cluster_id, ns_name)
            
            # Get replicas (if applicable)
            replicas = 1
            if hasattr(workload_obj.spec, 'replicas'):
                replicas = workload_obj.spec.replicas or 1
            
            workload_id = get_or_create_workload(
                namespace_id,
                workload_name,
                kind,
                replicas
            )
            
            # Collect cost metrics from OpenCost
            try:
                # Adjust the pod name pattern based on workload type
                pod_pattern = f"{workload_name}.*"
                if kind == "DaemonSet":
                    # DaemonSets have pods named differently
                    pod_pattern = f"{workload_name}-.*"
                elif kind == "Job" or kind == "CronJob":
                    # Jobs have pods with random suffixes
                    pod_pattern = f"{workload_name}-.*"
                
                opencost_query = f'sum(container_cpu_allocation{{namespace="{ns_name}",pod=~"{pod_pattern}"}}) * 0.02'  # $0.02 per CPU hour
                cpu_cost_result = prom.custom_query(opencost_query)
                cpu_cost = float(cpu_cost_result[0]["value"][1]) if cpu_cost_result else 0.0
                
                memory_cost_query = f'sum(container_memory_allocation_bytes{{namespace="{ns_name}",pod=~"{pod_pattern}"}}) / 1024 / 1024 / 1024 * 0.005'  # $0.005 per GB hour
                memory_cost_result = prom.custom_query(memory_cost_query)
                memory_cost = float(memory_cost_result[0]["value"][1]) if memory_cost_result else 0.0
                
                # Get resource requests and usage
                cpu_req_query = f'sum(kube_pod_container_resource_requests{{namespace="{ns_name}",pod=~"{pod_pattern}",resource="cpu"}})'
                cpu_req_result = prom.custom_query(cpu_req_query)
                cpu_requested = float(cpu_req_result[0]["value"][1]) if cpu_req_result else 0.0
                
                cpu_usage_query = f'sum(rate(container_cpu_usage_seconds_total{{namespace="{ns_name}",pod=~"{pod_pattern}"}}[5m]))'
                cpu_usage_result = prom.custom_query(cpu_usage_query)
                cpu_used = float(cpu_usage_result[0]["value"][1]) if cpu_usage_result else 0.0
                
                mem_req_query = f'sum(kube_pod_container_resource_requests{{namespace="{ns_name}",pod=~"{pod_pattern}",resource="memory"}}) / 1024 / 1024 / 1024'
                mem_req_result = prom.custom_query(mem_req_query)
                memory_requested = float(mem_req_result[0]["value"][1]) if mem_req_result else 0.0
                
                mem_usage_query = f'sum(container_memory_usage_bytes{{namespace="{ns_name}",pod=~"{pod_pattern}"}}) / 1024 / 1024 / 1024'
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
                logger.error(f"Error collecting cost metrics for {workload_name} ({kind}): {str(e)}")
            
            # Collect energy metrics from Kepler
            try:
                # Adjust the pod name pattern based on workload type
                pod_pattern = f"{workload_name}.*"
                if kind == "DaemonSet":
                    # DaemonSets have pods named differently
                    pod_pattern = f"{workload_name}-.*"
                elif kind == "Job" or kind == "CronJob":
                    # Jobs have pods with random suffixes
                    pod_pattern = f"{workload_name}-.*"
                
                energy_query = f'sum(kepler_container_joules_total{{namespace="{ns_name}",pod_name=~"{pod_pattern}"}})'
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
                logger.error(f"Error collecting energy metrics for {workload_name} ({kind}): {str(e)}")
            
            collected_count += 1
        
        logger.info(f"Metrics collection complete. Collected data for {collected_count} workloads.")
        
        # Broadcast metrics update to connected clients
        metrics_summary = {
            "workloads_processed": collected_count,
            "timestamp": datetime.now().isoformat(),
            "active_connections": realtime_metrics.get_active_connections_count()
        }
        await realtime_metrics.broadcast_metrics_update(metrics_summary)
        
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
            workload_name = workload["name"]
            workload_kind = workload["kind"]
            workload_namespace = workload["namespaces"]["name"] if "namespaces" in workload else "default"
            
            # Get recent cost metrics (last 24 hours)
            cost_metrics = supabase.table("cost_metrics") \
                .select("*") \
                .eq("workload_id", workload_id) \
                .gte("timestamp", (datetime.now() - timedelta(hours=24)).isoformat()) \
                .execute()
            
            # Get energy metrics
            energy_metrics = supabase.table("energy_metrics") \
                .select("*") \
                .eq("workload_id", workload_id) \
                .gte("timestamp", (datetime.now() - timedelta(hours=24)).isoformat()) \
                .execute()
            
            # Perform rightsizing analysis if we have cost metrics
            if cost_metrics.data:
                # Calculate averages
                avg_cpu_requested = sum(m["cpu_cores_requested"] for m in cost_metrics.data) / len(cost_metrics.data)
                avg_cpu_used = sum(m["cpu_cores_used"] for m in cost_metrics.data) / len(cost_metrics.data)
                avg_memory_requested = sum(m["memory_gb_requested"] for m in cost_metrics.data) / len(cost_metrics.data)
                avg_memory_used = sum(m["memory_gb_used"] for m in cost_metrics.data) / len(cost_metrics.data)
                avg_total_cost = sum(m["total_cost_usd"] for m in cost_metrics.data) / len(cost_metrics.data)
                
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
            
            # Perform scheduling analysis for workload types that might benefit
            if workload_kind in ["Deployment", "StatefulSet"]:
                try:
                    # Get detailed workload information from Kubernetes
                    if workload_kind == "Deployment":
                        k8s_workload = k8s_apps.read_namespaced_deployment(workload_name, workload_namespace)
                    elif workload_kind == "StatefulSet":
                        k8s_workload = k8s_apps.read_namespaced_stateful_set(workload_name, workload_namespace)
                    else:
                        k8s_workload = None
                    
                    if k8s_workload and k8s_workload.spec.template.spec:
                        template_spec = k8s_workload.spec.template.spec
                        
                        # Check if it's a batch job that could be a CronJob
                        # Look for workloads with restartPolicy: Always that might be batch jobs
                        if (hasattr(template_spec, 'restart_policy') and 
                            template_spec.restart_policy == "Always" and
                            not hasattr(template_spec, 'node_selector') and
                            not hasattr(template_spec, 'tolerations')):
                            
                            # Check if the workload might be a batch job based on resource requests
                            # Batch jobs often have different resource usage patterns
                            is_batch_job = False
                            if cost_metrics.data:
                                # If CPU utilization is very low, it might be a batch job
                                if cpu_utilization < 5:
                                    is_batch_job = True
                            
                            if is_batch_job:
                                explanation = f"Workload {workload_name} appears to be a batch job running continuously. Consider converting to a CronJob to avoid idle resources and reduce costs."
                                
                                # Conservative estimates for batch job conversion
                                estimated_savings = 50.0  # $50/month estimated savings
                                estimated_carbon_savings = 1000.0  # 1kg CO2e estimated savings
                                
                                supabase.table("opportunities").insert({
                                    "workload_id": workload_id,
                                    "opportunity_type": "scheduling",
                                    "status": "pending",
                                    "current_cost_usd": estimated_savings * 2,  # Estimated current cost
                                    "projected_cost_usd": estimated_savings,    # Estimated cost after optimization
                                    "savings_usd": estimated_savings,
                                    "current_carbon_gco2e": estimated_carbon_savings * 2,
                                    "projected_carbon_gco2e": estimated_carbon_savings,
                                    "carbon_reduction_gco2e": estimated_carbon_savings,
                                    "confidence_score": 0.7,
                                    "risk_level": "medium",
                                    "explanation": explanation,
                                    "ai_reasoning": f"Workload has restartPolicy: Always with low CPU utilization ({cpu_utilization:.1f}%) and no scheduling constraints. Likely a batch job."
                                }).execute()
                                
                                opportunities_created += 1
                        
                        # Suggest node selectors/taints for non-critical workloads
                        elif (not hasattr(template_spec, 'node_selector') and 
                              not hasattr(template_spec, 'tolerations') and
                              workload_kind == "Deployment"):
                            
                            explanation = f"Workload {workload_name} has no node selectors or taint tolerations. Consider adding these to schedule on cheaper or preemptible nodes."
                            
                            # Conservative estimates for scheduling optimization
                            estimated_savings = 30.0  # $30/month estimated savings
                            estimated_carbon_savings = 500.0  # 0.5kg CO2e estimated savings
                            
                            supabase.table("opportunities").insert({
                                "workload_id": workload_id,
                                "opportunity_type": "scheduling",
                                "status": "pending",
                                "current_cost_usd": estimated_savings * 2,  # Estimated current cost
                                "projected_cost_usd": estimated_savings,    # Estimated cost after optimization
                                "savings_usd": estimated_savings,
                                "current_carbon_gco2e": estimated_carbon_savings * 2,
                                "projected_carbon_gco2e": estimated_carbon_savings,
                                "carbon_reduction_gco2e": estimated_carbon_savings,
                                "confidence_score": 0.6,
                                "risk_level": "low",
                                "explanation": explanation,
                                "ai_reasoning": "Workload has no scheduling constraints. Adding node selectors/taints could reduce costs."
                            }).execute()
                            
                            opportunities_created += 1
                            
                except Exception as e:
                    logger.warning(f"Could not analyze scheduling for {workload_name}: {str(e)}")
            
            # Perform image optimization analysis
            try:
                # Get detailed workload information from Kubernetes for image analysis
                k8s_workload = None
                if workload_kind == "Deployment":
                    k8s_workload = k8s_apps.read_namespaced_deployment(workload_name, workload_namespace)
                elif workload_kind == "StatefulSet":
                    k8s_workload = k8s_apps.read_namespaced_stateful_set(workload_name, workload_namespace)
                elif workload_kind == "DaemonSet":
                    k8s_workload = k8s_apps.read_namespaced_daemon_set(workload_name, workload_namespace)
                elif workload_kind == "Job":
                    k8s_workload = k8s_batch.read_namespaced_job(workload_name, workload_namespace)
                elif workload_kind == "CronJob":
                    k8s_workload = k8s_batch.read_namespaced_cron_job(workload_name, workload_namespace)
                
                if k8s_workload:
                    # Convert Kubernetes object to dictionary for analysis
                    workload_dict = k8s_workload.to_dict()
                    image_analysis = analyze_image_optimization_opportunities(workload_dict)
                    
                    # Create opportunities for each image optimization finding
                    for opportunity in image_analysis["opportunities"]:
                        supabase.table("opportunities").insert({
                            "workload_id": workload_id,
                            "opportunity_type": opportunity["type"],
                            "status": "pending",
                            "current_cost_usd": opportunity["estimated_savings_usd"] * 2,
                            "projected_cost_usd": opportunity["estimated_savings_usd"],
                            "savings_usd": opportunity["estimated_savings_usd"],
                            "current_carbon_gco2e": opportunity["estimated_carbon_gco2e"] * 2,
                            "projected_carbon_gco2e": opportunity["estimated_carbon_gco2e"],
                            "carbon_reduction_gco2e": opportunity["estimated_carbon_gco2e"],
                            "confidence_score": opportunity["confidence_score"],
                            "risk_level": opportunity["risk_level"],
                            "explanation": opportunity["description"],
                            "ai_reasoning": f"Container image analysis: {opportunity['details']}"
                        }).execute()
                        
                        opportunities_created += 1
                        
            except Exception as e:
                logger.warning(f"Could not analyze image optimization for {workload_name}: {str(e)}")
            
            # Perform security analysis
            try:
                # Get detailed workload information from Kubernetes for security analysis
                k8s_workload = None
                if workload_kind == "Deployment":
                    k8s_workload = k8s_apps.read_namespaced_deployment(workload_name, workload_namespace)
                elif workload_kind == "StatefulSet":
                    k8s_workload = k8s_apps.read_namespaced_stateful_set(workload_name, workload_namespace)
                elif workload_kind == "DaemonSet":
                    k8s_workload = k8s_apps.read_namespaced_daemon_set(workload_name, workload_namespace)
                elif workload_kind == "Job":
                    k8s_workload = k8s_batch.read_namespaced_job(workload_name, workload_namespace)
                elif workload_kind == "CronJob":
                    k8s_workload = k8s_batch.read_namespaced_cron_job(workload_name, workload_namespace)
                
                if k8s_workload:
                    # Convert Kubernetes object to dictionary for analysis
                    workload_dict = k8s_workload.to_dict()
                    security_recommendations = analyze_security(workload_dict)
                    
                    # Create opportunities for each security recommendation
                    for recommendation in security_recommendations:
                        supabase.table("opportunities").insert({
                            "workload_id": workload_id,
                            "opportunity_type": recommendation["type"],
                            "status": "pending",
                            "current_cost_usd": recommendation["estimated_savings_usd"] * 2,
                            "projected_cost_usd": recommendation["estimated_savings_usd"],
                            "savings_usd": recommendation["estimated_savings_usd"],
                            "current_carbon_gco2e": recommendation["estimated_carbon_gco2e"] * 2,
                            "projected_carbon_gco2e": recommendation["estimated_carbon_gco2e"],
                            "carbon_reduction_gco2e": recommendation["estimated_carbon_gco2e"],
                            "confidence_score": recommendation["confidence_score"],
                            "risk_level": recommendation["risk_level"],
                            "explanation": recommendation["description"],
                            "ai_reasoning": f"Security analysis: {recommendation['details']}"
                        }).execute()
                        
                        opportunities_created += 1
                        
            except Exception as e:
                logger.warning(f"Could not analyze security for {workload_name}: {str(e)}")
        
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

# Add new endpoint for metrics data
@app.get("/metrics")
async def get_metrics():
    """Get all collected metrics data"""
    try:
        # Get cost metrics
        cost_metrics = supabase.table("cost_metrics").select("*").execute()
        
        # Get energy metrics
        energy_metrics = supabase.table("energy_metrics").select("*").execute()
        
        # Get workloads with related data
        workloads = supabase.table("workloads").select("*, namespaces(name, clusters(name))").execute()
        
        return {
            "cost_metrics": cost_metrics.data,
            "energy_metrics": energy_metrics.data,
            "workloads": workloads.data
        }
    except Exception as e:
        logger.error(f"Error retrieving metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/github_webhook")
async def github_webhook(request: Request):
    """Handle GitHub webhook events and analyze PR YAML changes for cost/carbon impact"""
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
            
            # Get base and head refs
            base_ref = payload["pull_request"]["base"]["sha"]
            head_ref = payload["pull_request"]["head"]["sha"]
            
            # Analyze PR changes
            changed_files = pr.get_files()
            total_delta_cost = 0.0
            total_delta_carbon_g = 0.0
            yaml_changes = []
            
            # Process each changed file
            for file in changed_files:
                if file.filename.endswith(('.yaml', '.yml')):
                    yaml_changes.append(file.filename)
                    
                    # Get file content at base and head refs
                    base_content = get_file_content_from_github(g, repo_name, file.filename, base_ref)
                    head_content = get_file_content_from_github(g, repo_name, file.filename, head_ref)
                    
                    # Parse resources from both versions
                    base_workloads = parse_resources_from_manifest(base_content)
                    head_workloads = parse_resources_from_manifest(head_content)
                    
                    # Compare resources and compute deltas
                    for b in base_workloads:
                        for h in head_workloads:
                            # Match by workload name and container name
                            if b["name"] == h["name"] and b["container"] == h["container"]:
                                cpu_before = parse_cpu_to_cores(b["cpu_request"])
                                cpu_after = parse_cpu_to_cores(h["cpu_request"])
                                mem_before = parse_mem_to_gb(b["mem_request"])
                                mem_after = parse_mem_to_gb(h["mem_request"])
                                
                                cpu_delta = cpu_after - cpu_before
                                mem_delta = mem_after - mem_before
                                
                                delta_cost = compute_cost_delta(cpu_delta, mem_delta)
                                delta_carbon = compute_carbon_delta(cpu_delta, mem_delta)
                                
                                total_delta_cost += delta_cost
                                total_delta_carbon_g += delta_carbon
            
            # Create detailed comment
            if yaml_changes:
                risk_level = "Low" if total_delta_cost <= 0 else "Medium" if total_delta_cost < 10 else "High"
                comment = f"""
## 🌿 GreenOps Advisor Analysis

This PR modifies Kubernetes manifests:
{chr(10).join([f'- `{f}`' for f in yaml_changes])}

### Estimated Impact
- **Cost Change**: ${total_delta_cost:.2f}/month
- **Carbon Impact**: {total_delta_carbon_g:.0f} gCO2e/month
- **Risk Level**: {risk_level}

{'⚠️ This PR increases resource requests which will increase costs.' if total_delta_cost > 0 else '✅ This PR reduces resource requests which will decrease costs.' if total_delta_cost < 0 else 'ℹ️ This PR does not significantly change resource requests.'}

---
*Powered by GreenOps Advisor | [Learn More](https://github.com/yourusername/greenops-advisor)*
"""
                pr.create_issue_comment(comment)
            
            # Store PR event with computed deltas
            pr_event_data = {
                "repo_full_name": repo_name,
                "pr_number": pr_number,
                "pr_url": pr.html_url,
                "delta_cost_usd": total_delta_cost,
                "delta_carbon_gco2e": total_delta_carbon_g,
                "risk_assessment": f"Cost delta: ${total_delta_cost:.2f}/month",
                "comment_url": pr.comments_url if yaml_changes else ""
            }
            
            supabase.table("pr_events").insert(pr_event_data).execute()
            
            # If there are significant savings, consider creating an optimization PR
            if total_delta_cost < -10 or total_delta_carbon_g > 1000:  # Thresholds for optimization
                github_automation = get_github_automation()
                if github_automation:
                    # Create optimization suggestions based on the analysis
                    optimization_changes = []
                    for file in changed_files:
                        if file.filename.endswith(('.yaml', '.yml')):
                            # For demonstration, we'll add a placeholder for optimization suggestions
                            optimization_changes.append({
                                "file_path": file.filename,
                                "content": head_content,  # In a real implementation, this would be optimized content
                                "description": f"Optimize resource requests based on usage patterns",
                                "estimated_savings": abs(total_delta_cost) * 0.5,  # 50% of the delta as potential savings
                                "carbon_reduction": total_delta_carbon_g * 0.5,
                                "commit_message": "Optimize resource requests for cost and carbon efficiency"
                            })
                    
                    # Create optimization PR
                    if optimization_changes:
                        pr_result = github_automation.create_optimization_pr(
                            repo_name=repo_name,
                            base_branch=payload["pull_request"]["base"]["ref"],
                            changes=optimization_changes,
                            pr_title="[Auto] GreenOps Optimization Suggestions"
                        )
                        
                        if pr_result["success"]:
                            logger.info(f"Created optimization PR: {pr_result['pr_url']}")
                            # Store the optimization PR reference
                            pr_event_data["optimization_pr_url"] = pr_result["pr_url"]
                            supabase.table("pr_events").update(pr_event_data).eq("id", pr_event_data["id"]).execute()
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add WebSocket endpoint for real-time metrics
@app.websocket("/ws/metrics")
async def websocket_metrics_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics updates"""
    await realtime_metrics.handle_websocket_connection(websocket)

# ========== BACKGROUND TASKS ==========

@app.on_event("startup")
async def startup_event():
    """Run on API startup"""
    logger.info("GreenOps Advisor API started")
    
    # Validate configuration
    config = get_config()
    if not config.is_valid():
        logger.error("Configuration validation failed:")
        for error in config.get_errors():
            logger.error(f"  - {error}")
        # Note: We don't exit here to allow the service to start for debugging
    
    logger.info(f"Prometheus URL: {os.getenv('PROMETHEUS_URL')}")
    logger.info(f"Supabase URL: {os.getenv('SUPABASE_URL')}")
    logger.info(f"AI Provider: {os.getenv('AI_PROVIDER', 'ollama')}")
    
    # Log configuration status
    if config.github_token:
        logger.info("GitHub token configured - PR automation enabled")
    else:
        logger.info("GitHub token not configured - PR automation disabled")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)