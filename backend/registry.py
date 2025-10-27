import requests
import base64
import json
from typing import Optional, Dict, Any
import os
from kubernetes import client
from kubernetes.client.rest import ApiException
import logging

logger = logging.getLogger(__name__)

# Default image size threshold in MB (200MB as mentioned in the requirements)
DEFAULT_IMAGE_SIZE_THRESHOLD_MB = 200

def get_container_image_size(image_ref: str) -> Optional[int]:
    """
    Get container image size in MB by checking various registries.
    
    Args:
        image_ref (str): Container image reference (e.g., 'nginx:latest', 'ghcr.io/user/repo:tag')
        
    Returns:
        Optional[int]: Image size in MB or None if unable to determine
    """
    try:
        if 'ghcr.io' in image_ref:
            # Get GitHub token from environment
            github_token = os.getenv('GITHUB_TOKEN')
            if not github_token:
                logger.warning("GITHUB_TOKEN not configured for GHCR access")
                return None
            return fetch_github_container_registry_size(image_ref, github_token)
        elif 'docker.io' in image_ref or '/' not in image_ref.split(':')[0]:
            return fetch_docker_hub_size(image_ref)
        else:
            # For other registries or as fallback, try to get size from Kubernetes
            return get_image_size_from_kubelet(image_ref)
    except Exception as e:
        logger.warning(f"Error fetching image size for {image_ref}: {str(e)}")
        return None

def fetch_github_container_registry_size(image_ref: str, github_token: str) -> Optional[int]:
    """
    Fetch image size from GitHub Container Registry.
    
    Args:
        image_ref (str): Full image reference (e.g., 'ghcr.io/user/repo:tag')
        github_token (str): GitHub personal access token
        
    Returns:
        Optional[int]: Image size in MB or None if unable to determine
    """
    try:
        # Extract owner/repo/tag from image reference
        # Format: ghcr.io/owner/repo:tag
        if not image_ref.startswith('ghcr.io/'):
            logger.warning(f"Invalid GHCR image reference: {image_ref}")
            return None
            
        parts = image_ref.split('/')
        if len(parts) < 3:
            logger.warning(f"Invalid GHCR image reference format: {image_ref}")
            return None
            
        # Extract the repository part (owner/repo:tag)
        repo_part = parts[2]  # owner/repo:tag or owner/repo
        if ':' in repo_part:
            repo_path, tag = repo_part.split(':', 1)
        else:
            repo_path = repo_part
            tag = 'latest'
            
        # Split owner and repo
        repo_parts = repo_path.split('/')
        if len(repo_parts) < 2:
            logger.warning(f"Invalid GHCR repository path: {repo_path}")
            return None
            
        owner, repo = repo_parts[0], repo_parts[1]
        
        # Get OAuth2 token for GHCR
        auth_url = "https://ghcr.io/token"
        auth_params = {
            'service': 'ghcr.io',
            'scope': f'repository:{owner}/{repo}:pull'
        }
        
        auth_response = requests.get(auth_url, params=auth_params, auth=('', github_token))
        if auth_response.status_code != 200:
            logger.warning(f"Failed to authenticate with GHCR for {image_ref}: {auth_response.status_code}")
            return None
            
        auth_data = auth_response.json()
        bearer_token = auth_data.get('token')
        
        if not bearer_token:
            logger.warning(f"Failed to get bearer token from GHCR for {image_ref}")
            return None
        
        # Fetch manifest
        manifest_url = f"https://ghcr.io/v2/{owner}/{repo}/manifests/{tag}"
        headers = {
            'Authorization': f'Bearer {bearer_token}',
            'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
        }
        
        manifest_response = requests.get(manifest_url, headers=headers)
        if manifest_response.status_code != 200:
            logger.warning(f"Failed to fetch manifest from GHCR for {image_ref}: {manifest_response.status_code}")
            return None
            
        manifest = manifest_response.json()
        
        # Calculate total size from layers
        total_size = 0
        if 'layers' in manifest:
            for layer in manifest['layers']:
                if 'size' in layer:
                    total_size += layer['size']
        
        # Convert bytes to MB
        size_mb = total_size / (1024 * 1024)
        logger.info(f"GHCR image {image_ref} size: {size_mb:.2f} MB")
        return int(size_mb)
        
    except Exception as e:
        logger.warning(f"Error fetching GitHub Container Registry size for {image_ref}: {str(e)}")
        return None

def fetch_docker_hub_size(image_ref: str) -> Optional[int]:
    """
    Fetch image size from Docker Hub.
    
    Args:
        image_ref (str): Full image reference (e.g., 'library/nginx:latest' or 'nginx:latest')
        
    Returns:
        Optional[int]: Image size in MB or None if unable to determine
    """
    try:
        # Normalize image reference for Docker Hub
        if image_ref.startswith('docker.io/'):
            image_ref = image_ref[10:]  # Remove docker.io/ prefix
            
        # Split into repo and tag
        if ':' in image_ref:
            repo, tag = image_ref.split(':', 1)
        else:
            repo = image_ref
            tag = 'latest'
            
        # If no user/organization specified, default to library
        if '/' not in repo:
            repo = f"library/{repo}"
            
        # Try to get size from Docker Hub API v2 (requires authentication for better rate limits)
        docker_hub_username = os.getenv('DOCKER_HUB_USERNAME')
        docker_hub_token = os.getenv('DOCKER_HUB_TOKEN')
        
        # First, try to get OAuth2 token if credentials are provided
        token = None
        if docker_hub_username and docker_hub_token:
            try:
                auth_url = "https://hub.docker.com/v2/users/login"
                auth_data = {
                    "username": docker_hub_username,
                    "password": docker_hub_token
                }
                auth_response = requests.post(auth_url, json=auth_data)
                if auth_response.status_code == 200:
                    auth_result = auth_response.json()
                    token = auth_result.get('token')
            except Exception as e:
                logger.warning(f"Failed to authenticate with Docker Hub: {str(e)}")
        
        # Fetch image manifest
        manifest_url = f"https://registry-1.docker.io/v2/{repo}/manifests/{tag}"
        headers = {
            'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
        }
        
        # Add authorization header if we have a token
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        manifest_response = requests.get(manifest_url, headers=headers)
        
        # If we get a 401, try to get a token from Docker Hub's auth service
        if manifest_response.status_code == 401 and 'WWW-Authenticate' in manifest_response.headers:
            try:
                # Extract auth parameters
                auth_header = manifest_response.headers['WWW-Authenticate']
                if auth_header.startswith('Bearer '):
                    # Parse the auth challenge
                    # This is a simplified parsing - in production, you'd want a proper parser
                    auth_params = {}
                    for param in auth_header[7:].split(','):
                        if '=' in param:
                            key, value = param.split('=', 1)
                            auth_params[key.strip()] = value.strip().strip('"')
                    
                    # Get token from auth service
                    token_url = auth_params.get('realm', 'https://auth.docker.io/token')
                    token_params = {
                        'service': auth_params.get('service', 'registry.docker.io'),
                        'scope': auth_params.get('scope')
                    }
                    
                    token_response = requests.get(token_url, params=token_params)
                    if token_response.status_code == 200:
                        token_data = token_response.json()
                        token = token_data.get('token') or token_data.get('access_token')
                        
                        # Retry manifest request with token
                        if token:
                            headers['Authorization'] = f'Bearer {token}'
                            manifest_response = requests.get(manifest_url, headers=headers)
            except Exception as e:
                logger.warning(f"Error during Docker Hub authentication: {str(e)}")
        
        # Process the manifest response
        if manifest_response.status_code == 200:
            manifest = manifest_response.json()
            
            # Calculate total size from layers
            total_size = 0
            if 'layers' in manifest:
                for layer in manifest['layers']:
                    if 'size' in layer:
                        total_size += layer['size']
            
            # Convert bytes to MB
            size_mb = total_size / (1024 * 1024)
            logger.info(f"Docker Hub image {image_ref} size: {size_mb:.2f} MB")
            return int(size_mb)
        
        # Fallback to Docker Hub API v1 (simpler but less reliable)
        logger.info(f"Trying Docker Hub API v2 fallback for {image_ref}")
        url = f"https://hub.docker.com/v2/repositories/{repo}/tags/{tag}"
        
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # Docker Hub API returns image size in bytes in the "full_size" field
            if 'full_size' in data:
                size_bytes = data['full_size']
                size_mb = size_bytes / (1024 * 1024)  # Convert to MB
                logger.info(f"Docker Hub image {image_ref} size (fallback): {size_mb:.2f} MB")
                return int(size_mb)
                
        return None
    except Exception as e:
        logger.warning(f"Error fetching Docker Hub size for {image_ref}: {str(e)}")
        return None

def get_image_size_from_kubelet(image_ref: str) -> Optional[int]:
    """
    Get image size by inspecting through Kubernetes API.
    
    Args:
        image_ref (str): Full image reference
        
    Returns:
        Optional[int]: Image size in MB or None if unable to determine
    """
    try:
        # This is a simplified approach - in reality, getting image sizes
        # from Kubernetes requires more complex interactions with the kubelet
        # For now, we'll return None as a fallback
        logger.info(f"Kubelet inspection for {image_ref} - simplified implementation")
        return None
    except Exception as e:
        logger.warning(f"Error getting image size from kubelet for {image_ref}: {str(e)}")
        return None

def analyze_image_optimization_opportunities(workload_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze workload for image optimization opportunities.
    
    Args:
        workload_data (Dict[str, Any]): Workload data containing container information
        
    Returns:
        Dict[str, Any]: Image optimization opportunity data
    """
    opportunities = []
    containers = []  # Initialize containers list
    
    try:
        # Extract containers from workload data
        if 'spec' in workload_data and 'template' in workload_data['spec']:
            template = workload_data['spec']['template']
            if 'spec' in template and 'containers' in template['spec']:
                containers = template['spec']['containers']
        elif 'spec' in workload_data and 'containers' in workload_data['spec']:
            containers = workload_data['spec']['containers']
            
        for container in containers:
            if 'image' not in container:
                continue
                
            image_ref = container['image']
            image_size_mb = get_container_image_size(image_ref)
            
            # If we can determine the image size and it's larger than threshold
            if image_size_mb and image_size_mb > DEFAULT_IMAGE_SIZE_THRESHOLD_MB:
                # Calculate estimated savings (simplified model)
                # Assume $0.0001 per MB per month for storage and transfer
                estimated_savings = (image_size_mb - DEFAULT_IMAGE_SIZE_THRESHOLD_MB) * 0.0001 * 30
                
                # Carbon savings estimation (simplified)
                # Assume 0.02 gCO2e per MB reduced
                estimated_carbon_savings = (image_size_mb - DEFAULT_IMAGE_SIZE_THRESHOLD_MB) * 0.02
                
                opportunity = {
                    "type": "image-optimization",
                    "description": f"Container image '{image_ref}' is {image_size_mb}MB, consider optimizing",
                    "estimated_savings_usd": round(estimated_savings, 2),
                    "estimated_carbon_gco2e": round(estimated_carbon_savings, 2),
                    "confidence_score": 0.8,
                    "risk_level": "low",
                    "details": {
                        "current_size_mb": image_size_mb,
                        "threshold_mb": DEFAULT_IMAGE_SIZE_THRESHOLD_MB,
                        "image_ref": image_ref
                    }
                }
                opportunities.append(opportunity)
                
    except Exception as e:
        logger.error(f"Error analyzing image optimization opportunities: {str(e)}")
        
    return {
        "opportunities": opportunities,
        "analyzed_containers": len(containers)
    }