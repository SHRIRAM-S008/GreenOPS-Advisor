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

# Query workloads
try:
    result = supabase.table("workloads").select("*").execute()
    print("Workloads in database:")
    for workload in result.data:
        print(f"- {workload['name']} (namespace_id: {workload['namespace_id']})")
        
    # Query namespaces
    namespaces = supabase.table("namespaces").select("*").execute()
    print("\nNamespaces:")
    for namespace in namespaces.data:
        print(f"- {namespace['name']} (id: {namespace['id']})")
        
    # Check if our demo-app namespace exists
    demo_ns = supabase.table("namespaces").select("*").eq("name", "demo-app").execute()
    if demo_ns.data:
        print(f"\nFound demo-app namespace with id: {demo_ns.data[0]['id']}")
        
        # Check workloads in demo-app namespace
        demo_workloads = supabase.table("workloads").select("*").eq("namespace_id", demo_ns.data[0]['id']).execute()
        print(f"Workloads in demo-app namespace:")
        for workload in demo_workloads.data:
            print(f"- {workload['name']}")
    else:
        print("\ndemo-app namespace not found in database")
        
except Exception as e:
    print(f"Error: {e}")