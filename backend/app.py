from fastapi import FastAPI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="GreenOps Advisor API", version="1.0.0")

@app.get("/")
def root():
    return {
        "message": "GreenOps Advisor API",
        "version": "1.0.0",
        "description": "AI-Powered Kubernetes Cost & Carbon Optimization"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "services": {
            "api": "healthy"
        }
    }