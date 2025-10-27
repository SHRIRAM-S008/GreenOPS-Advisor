import requests
import json
import os
from typing import Dict, Any
import yaml
import time
import logging

# Import the parsing functions from utils.py
from utils import parse_cpu_to_cores, parse_mem_to_gb
# Import the new AI provider abstraction
from ai_provider import get_ai_provider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

# Configuration constants for AI service
AI_TIMEOUT = int(os.getenv("AI_TIMEOUT_SECONDS", "60"))
AI_RETRIES = int(os.getenv("AI_RETRIES", "3"))

# Configuration constants for rightsizing calculations
DEFAULT_BUFFER = 1.25  # 25% buffer on top of observed peak usage
COST_PER_CPU_HOUR = 0.02  # From main.py collect_metrics function
COST_PER_GB_HOUR = 0.005   # From main.py collect_metrics function
HOURS_PER_MONTH = 24 * 30
REDUCTION_THRESHOLD = 0.85  # Only recommend reduction if suggested < current request by 15%

def compute_rightsizing(workload_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute rightsizing suggestion from actual requests vs usage with a safe buffer.
    
    Args:
        workload_data: Dictionary containing workload resource information
        
    Returns:
        Dictionary with suggested resources and estimated savings
    """
    # Parse current requests and usage
    cpu_req = parse_cpu_to_cores(workload_data.get("cpu_requested", "0"))
    mem_req = parse_mem_to_gb(workload_data.get("memory_requested", "0"))
    cpu_used = float(workload_data.get("cpu_used", 0.0))
    mem_used = float(workload_data.get("memory_used", 0.0))
    
    # Calculate suggested resources with buffer
    suggested_cpu = max(0.001, cpu_used * DEFAULT_BUFFER)
    suggested_mem = max(0.001, mem_used * DEFAULT_BUFFER)
    
    # Only recommend reduction if there's meaningful slack
    cpu_reduction = 0.0
    mem_reduction = 0.0
    
    if suggested_cpu < cpu_req * REDUCTION_THRESHOLD:
        cpu_reduction = cpu_req - suggested_cpu
    if suggested_mem < mem_req * REDUCTION_THRESHOLD:
        mem_reduction = mem_req - suggested_mem
    
    # Calculate monthly savings
    monthly_saving = (cpu_reduction * COST_PER_CPU_HOUR + mem_reduction * COST_PER_GB_HOUR) * HOURS_PER_MONTH
    
    return {
        "suggested_cpu": suggested_cpu,
        "suggested_mem_gb": suggested_mem,
        "monthly_saving_usd": monthly_saving
    }

def call_ai_model(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call the AI model with exponential backoff retries and structured error handling.
    Uses the new AI provider abstraction.
    
    Args:
        payload: Dictionary containing the request payload for the AI model
        
    Returns:
        Dictionary containing the AI response or fallback result
    """
    try:
        # Get the configured AI provider
        ai_provider = get_ai_provider()
        
        # Extract prompt and system prompt from payload
        prompt = payload.get("prompt", "")
        system_prompt = payload.get("system", None)
        
        logger.info(f"AI request using {ai_provider.__class__.__name__}")
        response = ai_provider.ask(prompt, system_prompt)
        return response
    except Exception as e:
        last_exc = str(e)
        logger.error(f"AI request failed: {last_exc}")
        
        # Return structured fallback
        return {
            "status": "fallback", 
            "error": last_exc,
            "fallback_used": True
        }

def generate_yaml_patch_for_workload(workload_data: Dict[str, Any], recommendation: Dict[str, Any]) -> str:
    """
    Generate a complete Kubernetes YAML manifest for a workload with recommended resources.
    
    Args:
        workload_data: Dictionary containing workload information
        recommendation: Dictionary containing AI recommendations
        
    Returns:
        String containing the complete YAML manifest
    """
    # Convert recommended resources to Kubernetes format
    recommended_cpu_millis = int(recommendation['recommended_cpu'] * 1000)
    recommended_memory_mib = int(recommendation['recommended_memory'] * 1024)
    recommended_cpu_limit_millis = int(recommendation['recommended_cpu'] * 1.5 * 1000)
    recommended_memory_limit_mib = int(recommendation['recommended_memory'] * 1.5 * 1024)
    
    yaml_template = f"""
apiVersion: apps/v1
kind: {workload_data['kind']}
metadata:
  name: {workload_data['name']}
  namespace: {workload_data['namespace']}
spec:
  template:
    spec:
      containers:
      - name: main  # Update with actual container name
        resources:
          requests:
            cpu: "{recommended_cpu_millis}m"
            memory: "{recommended_memory_mib}Mi"
          limits:
            cpu: "{recommended_cpu_limit_millis}m"
            memory: "{recommended_memory_limit_mib}Mi"
"""
    
    return yaml_template.strip()

def generate_strategic_merge_patch(original_yaml_text: str, suggested_resources: Dict[tuple, Dict[str, str]]) -> str:
    """
    Generate a strategic merge patch for Kubernetes resources.
    
    Args:
        original_yaml_text: Original YAML manifest string
        suggested_resources: Dict keyed by (workload_name, container_name) -> {"cpu": "200m", "memory": "256Mi"}
        
    Returns:
        String containing the strategic merge patch
    """
    try:
        # Parse the original YAML
        doc = yaml.safe_load(original_yaml_text)
        
        # Navigate to containers based on resource type
        spec = doc.get("spec", {})
        template = spec.get("template")
        
        if template:
            # For Deployments, StatefulSets, etc.
            containers = template.setdefault("spec", {}).setdefault("containers", [])
        else:
            # For direct Pod manifests
            containers = spec.setdefault("containers", [])
        
        # Update containers with suggested resources
        for c in containers:
            cname = c.get("name")
            workload_name = doc.get("metadata", {}).get("name")
            key = (workload_name, cname)
            
            if key in suggested_resources:
                # Create or update resources.requests/limits in patch
                res = suggested_resources[key]
                c.setdefault("resources", {})
                c["resources"].setdefault("requests", {})
                c["resources"].setdefault("limits", {})
                
                # Set requests
                c["resources"]["requests"]["cpu"] = res["cpu"]
                c["resources"]["requests"]["memory"] = res["memory"]
                
                # Set limits (typically 1.5x requests)
                cpu_millis = int(res["cpu"].rstrip('m'))
                memory_mib = int(res["memory"].rstrip('Mi'))
                c["resources"]["limits"]["cpu"] = f"{int(cpu_millis * 1.5)}m"
                c["resources"]["limits"]["memory"] = f"{int(memory_mib * 1.5)}Mi"
        
        # Return the patch as YAML
        return yaml.safe_dump(doc, default_flow_style=False)
    
    except Exception as e:
        logger.error(f"Error generating strategic merge patch: {e}")
        # Fallback to original template approach
        return "# Error generating patch. Please update container names manually.\n" + original_yaml_text

def generate_yaml_patch(workload_data: Dict[str, Any], recommendation: Dict[str, Any], workload_manifest: Dict[str, Any] | None = None) -> str:
    """
    Generate Kubernetes YAML patch based on recommendation.
    This is the main function that will be called by the application.
    
    Args:
        workload_data: Dictionary containing workload information
        recommendation: Dictionary containing AI recommendations
        workload_manifest: Optional Kubernetes workload manifest for strategic merge patch
    """
    
    # If we have the original workload manifest, use strategic merge patch approach
    if workload_manifest:
        try:
            # Convert recommendation to suggested resources format
            # For now, we'll assume a single container named after the workload
            # In a real implementation, this would need to be more sophisticated
            workload_name = workload_data['name']
            container_name = workload_data.get('container_name', 'main')
            
            # Convert recommended resources to Kubernetes format
            recommended_cpu_millis = int(recommendation['recommended_cpu'] * 1000)
            recommended_memory_mib = int(recommendation['recommended_memory'] * 1024)
            
            suggested_resources = {
                (workload_name, container_name): {
                    "cpu": f"{recommended_cpu_millis}m",
                    "memory": f"{recommended_memory_mib}Mi"
                }
            }
            
            # Convert manifest to YAML string for patch generation
            import yaml
            manifest_yaml = yaml.safe_dump(workload_manifest, default_flow_style=False)
            
            # Generate strategic merge patch
            return generate_strategic_merge_patch(manifest_yaml, suggested_resources)
        except Exception as e:
            logger.warning(f"Failed to generate strategic merge patch: {e}. Falling back to complete manifest.")
    
    # Fallback to complete manifest approach
    return generate_yaml_patch_for_workload(workload_data, recommendation)

def generate_recommendation(workload_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use Ollama to generate human-readable recommendations
    """
    
    prompt = f"""
You are a Kubernetes cost optimization expert. Analyze this workload and provide recommendations:

Workload: {workload_data['name']}
Type: {workload_data['kind']}
Namespace: {workload_data['namespace']}

Current Resources:
- CPU Requested: {workload_data['cpu_requested']} cores
- CPU Used (avg): {workload_data['cpu_used']} cores
- CPU Utilization: {workload_data['cpu_utilization']:.1f}%
- Memory Requested: {workload_data['memory_requested']} GB
- Memory Used (avg): {workload_data['memory_used']} GB
- Memory Utilization: {workload_data['memory_utilization']:.1f}%

Current Cost: ${workload_data['current_cost']:.2f}/month
Current Carbon: {workload_data['current_carbon']:.2f} gCO2e/month

Provide:
1. A brief explanation of the inefficiency (2-3 sentences)
2. Recommended CPU value (in cores)
3. Recommended Memory value (in GB)
4. Estimated monthly savings ($)
5. Risk assessment (low/medium/high)
6. One actionable next step

Format your response as JSON with keys: explanation, recommended_cpu, recommended_memory, estimated_savings, risk_level, next_step
"""

    try:
        payload = {
            "model": "mistral:7b",
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        
        response_data = call_ai_model(payload)
        
        # Check if we got a fallback response
        if response_data.get("fallback_used"):
            logger.info("Using fallback recommendation due to AI service failure")
            # Use improved fallback logic instead of arbitrary multipliers
            rightsizing = compute_rightsizing(workload_data)
            return {
                "explanation": "AI analysis unavailable. Rightsizing recommendation based on actual usage patterns.",
                "recommended_cpu": rightsizing["suggested_cpu"],
                "recommended_memory": rightsizing["suggested_mem_gb"],
                "estimated_savings": rightsizing["monthly_saving_usd"],
                "risk_level": "medium",
                "next_step": "Manually review resource usage patterns"
            }
        
        if response_data.get("status") == "fallback":
            logger.info("Using fallback recommendation due to AI service failure")
            # Use improved fallback logic instead of arbitrary multipliers
            rightsizing = compute_rightsizing(workload_data)
            return {
                "explanation": f"AI analysis unavailable: {response_data.get('error', 'Unknown error')}. Rightsizing recommendation based on actual usage patterns.",
                "recommended_cpu": rightsizing["suggested_cpu"],
                "recommended_memory": rightsizing["suggested_mem_gb"],
                "estimated_savings": rightsizing["monthly_saving_usd"],
                "risk_level": "medium",
                "next_step": "Manually review resource usage patterns"
            }
        
        # Process successful AI response
        if "response" in response_data:
            result = response_data
            recommendation = json.loads(result["response"])
            return recommendation
        else:
            # Use improved fallback logic instead of arbitrary multipliers
            rightsizing = compute_rightsizing(workload_data)
            return {
                "explanation": "AI analysis unavailable. Rightsizing recommendation based on actual usage patterns.",
                "recommended_cpu": rightsizing["suggested_cpu"],
                "recommended_memory": rightsizing["suggested_mem_gb"],
                "estimated_savings": rightsizing["monthly_saving_usd"],
                "risk_level": "medium",
                "next_step": "Manually review resource usage patterns"
            }
    
    except Exception as e:
        logger.error(f"Error generating AI recommendation: {e}")
        # Use improved fallback logic instead of arbitrary multipliers
        rightsizing = compute_rightsizing(workload_data)
        return {
            "explanation": f"Error: {str(e)}. Rightsizing recommendation based on actual usage patterns.",
            "recommended_cpu": rightsizing["suggested_cpu"],
            "recommended_memory": rightsizing["suggested_mem_gb"],
            "estimated_savings": rightsizing["monthly_saving_usd"],
            "risk_level": "high",
            "next_step": "Fix AI integration"
        }

# Test function
if __name__ == "__main__":
    test_data = {
        "name": "my-app",
        "kind": "Deployment",
        "namespace": "default",
        "cpu_requested": 2.0,
        "cpu_used": 0.3,
        "cpu_utilization": 15.0,
        "memory_requested": 4.0,
        "memory_used": 1.2,
        "memory_utilization": 30.0,
        "current_cost": 150.0,
        "current_carbon": 25.0
    }
    
    recommendation = generate_recommendation(test_data)
    print("AI Recommendation:")
    print(json.dumps(recommendation, indent=2))
    
    patch = generate_yaml_patch(test_data, recommendation)
    print("\nYAML Patch:")
    print(patch)
    
    # Test strategic merge patch generation
    sample_yaml = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: main
        image: nginx:latest
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
"""
    
    suggested_resources = {
        ("my-app", "main"): {
            "cpu": "375m",
            "memory": "1536Mi"
        }
    }
    
    patch = generate_strategic_merge_patch(sample_yaml, suggested_resources)
    print("\nStrategic Merge Patch:")
    print(patch)