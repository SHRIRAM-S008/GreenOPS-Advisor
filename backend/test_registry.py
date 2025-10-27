#!/usr/bin/env python3
"""
Test script for container registry integration
"""

import os
import sys
import logging

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from registry import get_container_image_size, fetch_docker_hub_size, fetch_github_container_registry_size

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_registry_integration():
    """Test container registry integration functions"""
    
    print("=== Container Registry Integration Test ===\n")
    
    # Show which environment variables are set
    print("Environment Variables:")
    print(f"  DOCKER_HUB_USERNAME: {'SET' if os.getenv('DOCKER_HUB_USERNAME') else 'NOT SET'}")
    print(f"  DOCKER_HUB_TOKEN: {'SET' if os.getenv('DOCKER_HUB_TOKEN') else 'NOT SET'}")
    print(f"  GITHUB_TOKEN: {'SET' if os.getenv('GITHUB_TOKEN') else 'NOT SET'}")
    print()
    
    # Test Docker Hub integration
    print("1. Testing Docker Hub integration:")
    try:
        # Test with a common public image
        image_ref = "nginx:latest"
        print(f"   Testing {image_ref}...")
        size = fetch_docker_hub_size(image_ref)
        if size is not None:
            print(f"   ✓ Successfully retrieved size: {size} MB")
        else:
            print(f"   ⚠ Could not retrieve size (may need authentication)")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test with another common image
    print("\n   Testing library/alpine:latest...")
    try:
        size = fetch_docker_hub_size("library/alpine:latest")
        if size is not None:
            print(f"   ✓ Successfully retrieved size: {size} MB")
        else:
            print(f"   ⚠ Could not retrieve size")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test GitHub Container Registry integration (if credentials are available)
    print("\n2. Testing GitHub Container Registry integration:")
    github_token = os.getenv('GITHUB_TOKEN')
    if github_token:
        try:
            # Test with a sample GHCR image (you would replace this with an actual image)
            image_ref = "ghcr.io/owner/repo:tag"
            print(f"   Testing {image_ref}...")
            size = fetch_github_container_registry_size(image_ref, github_token)
            if size is not None:
                print(f"   ✓ Successfully retrieved size: {size} MB")
            else:
                print(f"   ⚠ Could not retrieve size (check image reference and permissions)")
        except Exception as e:
            print(f"   ✗ Error: {e}")
    else:
        print("   ⚠ GITHUB_TOKEN not configured, skipping GHCR tests")
    
    # Test the main function
    print("\n3. Testing main get_container_image_size function:")
    test_images = [
        "nginx:latest",
        "alpine:latest",
        "redis:latest",
        "postgres:latest"
    ]
    
    for image in test_images:
        try:
            print(f"   Testing {image}...")
            size = get_container_image_size(image)
            if size is not None:
                print(f"   ✓ Size: {size} MB")
            else:
                print(f"   ⚠ Could not determine size")
        except Exception as e:
            print(f"   ✗ Error: {e}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_registry_integration()