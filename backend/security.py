from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

def analyze_security(workload_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Analyze workload for security best practices and recommendations.
    
    Args:
        workload_data (Dict[str, Any]): Workload data containing spec information
        
    Returns:
        List[Dict[str, Any]]: List of security recommendations
    """
    recommendations = []
    
    try:
        # Extract workload spec
        spec = workload_data.get("spec", {})
        template = spec.get("template", {})
        template_spec = template.get("spec", {}) if template else spec
        
        # Check for securityContext
        if "securityContext" not in template_spec:
            recommendations.append({
                "type": "security",
                "description": "Workload missing securityContext. Consider adding security constraints.",
                "estimated_savings_usd": 0,  # No direct cost savings
                "estimated_carbon_gco2e": 0,  # No direct carbon savings
                "confidence_score": 0.9,
                "risk_level": "medium",
                "details": {
                    "recommendation": "Add securityContext with runAsNonRoot, readOnlyRootFilesystem, and allowPrivilegeEscalation=false"
                }
            })
        else:
            security_context = template_spec["securityContext"]
            
            # Check runAsNonRoot
            if security_context.get("runAsNonRoot") is not True:
                recommendations.append({
                    "type": "security",
                    "description": "Workload should run as non-root user for security.",
                    "estimated_savings_usd": 0,
                    "estimated_carbon_gco2e": 0,
                    "confidence_score": 0.8,
                    "risk_level": "medium",
                    "details": {
                        "recommendation": "Set securityContext.runAsNonRoot=true"
                    }
                })
            
            # Check readOnlyRootFilesystem
            if security_context.get("readOnlyRootFilesystem") is not True:
                recommendations.append({
                    "type": "security",
                    "description": "Workload should use read-only root filesystem for security.",
                    "estimated_savings_usd": 0,
                    "estimated_carbon_gco2e": 0,
                    "confidence_score": 0.7,
                    "risk_level": "low",
                    "details": {
                        "recommendation": "Set securityContext.readOnlyRootFilesystem=true"
                    }
                })
        
        # Check containers for security settings
        containers = template_spec.get("containers", [])
        for i, container in enumerate(containers):
            container_name = container.get("name", f"container-{i}")
            
            # Check container securityContext
            if "securityContext" not in container:
                recommendations.append({
                    "type": "security",
                    "description": f"Container '{container_name}' missing securityContext.",
                    "estimated_savings_usd": 0,
                    "estimated_carbon_gco2e": 0,
                    "confidence_score": 0.9,
                    "risk_level": "medium",
                    "details": {
                        "recommendation": f"Add securityContext to container '{container_name}' with capabilities drop and readOnlyRootFilesystem"
                    }
                })
            else:
                container_security = container["securityContext"]
                
                # Check capabilities
                if "capabilities" not in container_security:
                    recommendations.append({
                        "type": "security",
                        "description": f"Container '{container_name}' should drop unnecessary capabilities.",
                        "estimated_savings_usd": 0,
                        "estimated_carbon_gco2e": 0,
                        "confidence_score": 0.8,
                        "risk_level": "low",
                        "details": {
                            "recommendation": f"Set securityContext.capabilities.drop=['ALL'] for container '{container_name}'"
                        }
                    })
                
                # Check privileged mode
                if container_security.get("privileged") is True:
                    recommendations.append({
                        "type": "security",
                        "description": f"Container '{container_name}' running in privileged mode. This is a security risk.",
                        "estimated_savings_usd": 0,
                        "estimated_carbon_gco2e": 0,
                        "confidence_score": 0.95,
                        "risk_level": "high",
                        "details": {
                            "recommendation": f"Remove privileged=true from container '{container_name}'"
                        }
                    })
        
        # Check for resource limits (security best practice)
        for i, container in enumerate(containers):
            container_name = container.get("name", f"container-{i}")
            
            if "resources" not in container:
                recommendations.append({
                    "type": "security",
                    "description": f"Container '{container_name}' missing resource limits. This can lead to DoS attacks.",
                    "estimated_savings_usd": 0,
                    "estimated_carbon_gco2e": 0,
                    "confidence_score": 0.8,
                    "risk_level": "medium",
                    "details": {
                        "recommendation": f"Add resources.limits to container '{container_name}'"
                    }
                })
            else:
                resources = container["resources"]
                if "limits" not in resources:
                    recommendations.append({
                        "type": "security",
                        "description": f"Container '{container_name}' missing resource limits. This can lead to DoS attacks.",
                        "estimated_savings_usd": 0,
                        "estimated_carbon_gco2e": 0,
                        "confidence_score": 0.8,
                        "risk_level": "medium",
                        "details": {
                            "recommendation": f"Add resources.limits to container '{container_name}'"
                        }
                    })
        
        # Check for hostPath volumes (security risk)
        volumes = template_spec.get("volumes", [])
        for volume in volumes:
            if "hostPath" in volume:
                volume_name = volume.get("name", "unknown")
                recommendations.append({
                    "type": "security",
                    "description": f"Volume '{volume_name}' uses hostPath which can be a security risk.",
                    "estimated_savings_usd": 0,
                    "estimated_carbon_gco2e": 0,
                    "confidence_score": 0.9,
                    "risk_level": "high",
                    "details": {
                        "recommendation": f"Avoid hostPath volumes or use subPath with restricted permissions"
                    }
                })
                
    except Exception as e:
        logger.error(f"Error analyzing security for workload: {str(e)}")
        
    return recommendations