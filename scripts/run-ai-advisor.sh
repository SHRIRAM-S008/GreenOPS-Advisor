#!/bin/bash

# Script to run the GreenOps AI Advisor

echo "GreenOps AI Advisor"
echo "=================="

# Activate virtual environment
source ~/greenops-advisor/backend/venv/bin/activate

# Run the AI advisor script
python3 ./scripts/ai-advisor.py

# Deactivate virtual environment
deactivate