#!/usr/bin/env python3

import requests
import json
import subprocess
import time
import os

class GreenOpsAIAdvisor:
    def __init__(self):
        self.prometheus_url = "http://localhost:9090"
        self.opencost_url = "http://localhost:9003"
        self.ollama_url = "http://localhost:11434"
        self.model = "mistral:7b"
    
    def ensure_ollama_running(self):
        """Check if Ollama is running, start it if not"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                print("✅ Ollama is already running")
                return True
        except requests.exceptions.RequestException:
            pass
        
        print("🔄 Starting Ollama service...")
        try:
            # Start Ollama in the background
            subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            # Wait a moment for it to start
            time.sleep(3)
            
            # Verify it's running now
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                print("✅ Ollama started successfully")
                return True
        except Exception as e:
            print(f"❌ Failed to start Ollama: {e}")
            return False
        
        return False
    
    def get_high_cost_workloads(self):
        """Get workloads with highest cost from OpenCost"""
        try:
            response = requests.get(f"{self.opencost_url}/allocation/compute?window=1d", timeout=15)
            if response.status_code == 200:
                data = response.json()
                # Extract high cost workloads (simplified)
                return data.get('data', [])
        except Exception as e:
            print(f"⚠️  Warning: Error fetching cost data: {e}")
        return []
    
    def get_high_energy_consumption(self):
        """Get containers with high energy consumption from Kepler"""
        try:
            response = requests.get("http://localhost:9102/metrics", timeout=15)
            if response.status_code == 200:
                metrics = response.text
                # Filter for high energy consuming containers (simplified)
                energy_lines = [line for line in metrics.split('\n') if 'kepler_container_core_joules_total' in line and not line.startswith('#')]
                return energy_lines[:10]  # Top 10
        except Exception as e:
            print(f"⚠️  Warning: Error fetching energy data: {e}")
        return []
    
    def get_cluster_utilization(self):
        """Get cluster utilization metrics from Prometheus"""
        try:
            # CPU utilization query
            cpu_query = "avg(rate(container_cpu_usage_seconds_total[5m]))"
            response = requests.get(f"{self.prometheus_url}/api/v1/query", params={"query": cpu_query}, timeout=15)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"⚠️  Warning: Error fetching cluster utilization: {e}")
        return {}
    
    def generate_recommendations(self, cost_data, energy_data, utilization_data):
        """Generate optimization recommendations using Ollama"""
        # Prepare context for the AI
        context = {
            "cost_data_summary": f"Found {len(cost_data)} cost entries",
            "high_energy_containers": len(energy_data),
            "cluster_utilization": str(utilization_data)[:200] + "..." if utilization_data else "No data"
        }
        
        prompt = f"""
        As a GreenOps advisor, analyze the following Kubernetes cluster data:
        
        Cost Data: {context['cost_data_summary']}
        High Energy Consumption Containers: {context['high_energy_containers']} containers identified
        Cluster Utilization: {context['cluster_utilization']}
        
        Provide specific recommendations to:
        1. Reduce carbon footprint by optimizing energy consumption
        2. Lower costs by rightsizing workloads
        3. Improve cluster efficiency
        
        Format your response as a list of actionable items with estimated impact.
        """
        
        try:
            # Send request to Ollama
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }
            
            print("🤖 Generating AI recommendations (this may take 15-30 seconds)...")
            response = requests.post(f"{self.ollama_url}/api/generate", json=payload, timeout=120)
            if response.status_code == 200:
                result = response.json()
                return result.get('response', 'No recommendations generated')
        except Exception as e:
            return f"Error generating recommendations: {e}"
        
        return "Could not generate recommendations"
    
    def run_analysis(self):
        """Run complete analysis and provide recommendations"""
        print("GreenOps AI Advisor - Analyzing your cluster...")
        print("=" * 50)
        
        # Ensure Ollama is running
        if not self.ensure_ollama_running():
            print("❌ Cannot proceed without Ollama. Please install and start Ollama manually.")
            return
        
        # Check if required services are accessible
        print("🔍 Checking service connectivity...")
        try:
            requests.get(f"{self.prometheus_url}/-/healthy", timeout=5)
            print("✅ Prometheus is accessible")
        except:
            print("⚠️  Warning: Prometheus not accessible. Some metrics may be missing.")
        
        try:
            requests.get(f"{self.opencost_url}/allocation/compute?window=1d", timeout=5)
            print("✅ OpenCost is accessible")
        except:
            print("⚠️  Warning: OpenCost not accessible. Cost data may be missing.")
        
        try:
            requests.get("http://localhost:9102/metrics", timeout=5)
            print("✅ Kepler is accessible")
        except:
            print("⚠️  Warning: Kepler not accessible. Energy data may be missing.")
        
        # Gather data
        print("\n📊 Fetching data from services...")
        print("  Fetching cost data...")
        cost_data = self.get_high_cost_workloads()
        
        print("  Fetching energy data...")
        energy_data = self.get_high_energy_consumption()
        
        print("  Fetching cluster utilization...")
        utilization_data = self.get_cluster_utilization()
        
        # Generate recommendations
        print("\n🤖 Generating AI-powered recommendations...")
        recommendations = self.generate_recommendations(cost_data, energy_data, utilization_data)
        
        print("\n💡 AI Recommendations:")
        print("=" * 50)
        print(recommendations)

if __name__ == "__main__":
    advisor = GreenOpsAIAdvisor()
    advisor.run_analysis()