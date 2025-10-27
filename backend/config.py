import os
from typing import Optional
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

class Config:
    """Configuration validation and management"""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self._validate()
    
    def _validate(self):
        """Validate all required configuration"""
        # Supabase configuration
        self.supabase_url = self._get_required_env("SUPABASE_URL")
        self.supabase_key = self._get_required_env("SUPABASE_KEY")
        
        # Service URLs (optional with defaults)
        self.prometheus_url = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
        self.opencost_url = os.getenv("OPENCOST_URL", "http://localhost:9003")
        self.kepler_url = os.getenv("KEPLER_URL", "http://localhost:8081")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        
        # AI Provider configuration
        self.ai_provider = os.getenv("AI_PROVIDER", "ollama")
        if self.ai_provider == "openai":
            self._get_required_env("OPENAI_API_KEY")
        elif self.ai_provider == "anthropic":
            self._get_required_env("ANTHROPIC_API_KEY")
            
        # GitHub configuration (optional)
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.github_app_id = os.getenv("GITHUB_APP_ID")
        self.github_private_key = os.getenv("GITHUB_PRIVATE_KEY")
        
        # Constants
        self.cluster_name = os.getenv("CLUSTER_NAME", "minikube-demo")
        self.carbon_intensity = float(os.getenv("CARBON_INTENSITY_G_PER_KWH", "475"))
        
        # AI Service configuration
        self.ai_timeout_seconds = int(os.getenv("AI_TIMEOUT_SECONDS", "60"))
        self.ai_retries = int(os.getenv("AI_RETRIES", "3"))
        
        # Image optimization threshold
        self.image_size_threshold_mb = int(os.getenv("IMAGE_SIZE_THRESHOLD_MB", "200"))
        
        # Log any configuration issues
        if self.errors:
            logger.error("Configuration errors found:")
            for error in self.errors:
                logger.error(f"  - {error}")
                
        if self.warnings:
            logger.warning("Configuration warnings:")
            for warning in self.warnings:
                logger.warning(f"  - {warning}")
    
    def _get_required_env(self, key: str) -> Optional[str]:
        """Get required environment variable or add to errors"""
        value = os.getenv(key)
        if not value:
            self.errors.append(f"Missing required environment variable: {key}")
        return value
    
    def is_valid(self) -> bool:
        """Check if configuration is valid"""
        return len(self.errors) == 0
    
    def get_errors(self) -> list:
        """Get configuration errors"""
        return self.errors.copy()
    
    def get_warnings(self) -> list:
        """Get configuration warnings"""
        return self.warnings.copy()

# Global configuration instance
config = Config()

def get_config() -> Config:
    """Get the global configuration instance"""
    return config