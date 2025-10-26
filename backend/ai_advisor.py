import requests
import json
import os
from typing import Dict, Any

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

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
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "mistral:7b",
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            recommendation = json.loads(result["response"])
            return recommendation
        else:
            return {
                "explanation": "AI analysis unavailable",
                "recommended_cpu": workload_data['cpu_used'] * 2,
                "recommended_memory": workload_data['memory_used'] * 2,
                "estimated_savings": workload_data['current_cost'] * 0.5,
                "risk_level": "medium",
                "next_step": "Manually review resource usage patterns"
            }
    
    except Exception as e:
        print(f"Error generating AI recommendation: {e}")
        return {
            "explanation": f"Error: {str(e)}",
            "recommended_cpu": workload_data['cpu_used'] * 2,
            "recommended_memory": workload_data['memory_used'] * 2,
            "estimated_savings": 0,
            "risk_level": "high",
            "next_step": "Fix AI integration"
        }

def generate_yaml_patch(workload_data: Dict[str, Any], recommendation: Dict[str, Any]) -> str:
    """
    Generate Kubernetes YAML patch based on recommendation
    """
    
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
            cpu: "{int(recommendation['recommended_cpu'] * 1000)}m"
            memory: "{int(recommendation['recommended_memory'] * 1024)}Mi"
          limits:
            cpu: "{int(recommendation['recommended_cpu'] * 1.5 * 1000)}m"
            memory: "{int(recommendation['recommended_memory'] * 1.5 * 1024)}Mi"
"""
    
    return yaml_template.strip()

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