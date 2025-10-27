from abc import ABC, abstractmethod
import os
import requests
import json
from typing import Dict, Any, Optional
import logging
import time
import random

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    """Abstract base class for AI providers"""
    
    @abstractmethod
    def ask(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Ask the AI provider a question
        
        Args:
            prompt (str): The user prompt
            system_prompt (Optional[str]): System prompt to guide the AI
            
        Returns:
            Dict[str, Any]: AI response
        """
        pass

class OllamaProvider(AIProvider):
    """Ollama AI provider implementation"""
    
    def __init__(self):
        self.url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "mistral:7b")
        self.timeout = int(os.getenv("AI_TIMEOUT_SECONDS", "30"))
        self.retries = int(os.getenv("AI_RETRIES", "3"))
        
    def ask(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Ask Ollama a question
        
        Args:
            prompt (str): The user prompt
            system_prompt (Optional[str]): System prompt to guide the AI
            
        Returns:
            Dict[str, Any]: AI response
        """
        url = f"{self.url}/api/generate"
        
        # Prepare the payload
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        
        if system_prompt:
            payload["system"] = system_prompt
            
        # Try with retries
        last_exception = Exception("Unknown error")  # Initialize with a default exception
        for attempt in range(self.retries):
            try:
                response = requests.post(url, json=payload, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                last_exception = e
                logger.warning(f"Ollama request failed (attempt {attempt + 1}/{self.retries}): {str(e)}")
                if attempt < self.retries - 1:
                    # Add jitter to prevent thundering herd
                    sleep_time = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(sleep_time)
        
        # If all retries failed, raise the last exception
        raise last_exception

class OpenAIProvider(AIProvider):
    """OpenAI provider implementation"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.url = "https://api.openai.com/v1/chat/completions"
        self.timeout = int(os.getenv("AI_TIMEOUT_SECONDS", "30"))
        self.retries = int(os.getenv("AI_RETRIES", "3"))
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required for OpenAI provider")
            
    def ask(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Ask OpenAI a question
        
        Args:
            prompt (str): The user prompt
            system_prompt (Optional[str]): System prompt to guide the AI
            
        Returns:
            Dict[str, Any]: AI response
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7
        }
        
        # Try with retries
        last_exception = Exception("Unknown error")  # Initialize with a default exception
        for attempt in range(self.retries):
            try:
                response = requests.post(self.url, headers=headers, json=payload, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                last_exception = e
                logger.warning(f"OpenAI request failed (attempt {attempt + 1}/{self.retries}): {str(e)}")
                if attempt < self.retries - 1:
                    # Add jitter to prevent thundering herd
                    sleep_time = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(sleep_time)
        
        # If all retries failed, raise the last exception
        raise last_exception

class AnthropicProvider(AIProvider):
    """Anthropic provider implementation"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")
        self.url = "https://api.anthropic.com/v1/messages"
        self.timeout = int(os.getenv("AI_TIMEOUT_SECONDS", "30"))
        self.retries = int(os.getenv("AI_RETRIES", "3"))
        
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required for Anthropic provider")
            
    def ask(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Ask Anthropic a question
        
        Args:
            prompt (str): The user prompt
            system_prompt (Optional[str]): System prompt to guide the AI
            
        Returns:
            Dict[str, Any]: AI response
        """
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Prepare messages
        messages = [{"role": "user", "content": prompt}]
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 1024
        }
        
        if system_prompt:
            payload["system"] = system_prompt
            
        # Try with retries
        last_exception = Exception("Unknown error")  # Initialize with a default exception
        for attempt in range(self.retries):
            try:
                response = requests.post(self.url, headers=headers, json=payload, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                last_exception = e
                logger.warning(f"Anthropic request failed (attempt {attempt + 1}/{self.retries}): {str(e)}")
                if attempt < self.retries - 1:
                    # Add jitter to prevent thundering herd
                    sleep_time = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(sleep_time)
        
        # If all retries failed, raise the last exception
        raise last_exception

def get_ai_provider() -> AIProvider:
    """
    Get the configured AI provider based on environment variables
    
    Returns:
        AIProvider: Configured AI provider instance
    """
    provider_type = os.getenv("AI_PROVIDER", "ollama").lower()
    
    if provider_type == "openai":
        return OpenAIProvider()
    elif provider_type == "anthropic":
        return AnthropicProvider()
    else:
        # Default to Ollama
        return OllamaProvider()