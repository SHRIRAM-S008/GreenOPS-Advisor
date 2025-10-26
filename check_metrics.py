import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv('/Users/shriram/greenops-advisor/backend/.env')

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Get demo-app namespace ID
demo_ns = supabase.table("namespaces").select("id").eq("name", "demo-app").execute()
if demo_ns.data:
    namespace_id = demo_ns.data[0]['id']
    print(f"demo-app namespace ID: {namespace_id}")
    
    # Get workloads in demo-app namespace
    demo_workloads = supabase.table("workloads").select("id, name").eq("namespace_id", namespace_id).execute()
    
    for workload in demo_workloads.data:
        print(f"\nChecking metrics for {workload['name']} (ID: {workload['id']}):")
        
        # Check cost metrics
        cost_metrics = supabase.table("cost_metrics").select("*").eq("workload_id", workload['id']).limit(5).execute()
        if cost_metrics.data:
            print(f"  Found {len(cost_metrics.data)} cost metrics")
            for metric in cost_metrics.data:
                print(f"    CPU: {metric['cpu_cores_requested']:.3f} requested / {metric['cpu_cores_used']:.3f} used")
                print(f"    Memory: {metric['memory_gb_requested']:.3f} GB requested / {metric['memory_gb_used']:.3f} GB used")
                print(f"    Cost: ${metric['total_cost_usd']:.6f}")
        else:
            print("  No cost metrics found")
            
        # Check energy metrics
        energy_metrics = supabase.table("energy_metrics").select("*").eq("workload_id", workload['id']).limit(5).execute()
        if energy_metrics.data:
            print(f"  Found {len(energy_metrics.data)} energy metrics")
            for metric in energy_metrics.data:
                print(f"    Energy: {metric['energy_joules']:.2f} joules")
                print(f"    Carbon: {metric['carbon_gco2e']:.2f} gCO2e")
        else:
            print("  No energy metrics found")
else:
    print("demo-app namespace not found")