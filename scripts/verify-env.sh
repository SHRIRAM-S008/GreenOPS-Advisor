#!/bin/bash

# Script to verify environment variables configuration

echo "=== GreenOps Advisor Environment Variables Verification ==="

echo ""
echo "1. Checking frontend environment variables..."
echo "----------------------------------------"

if [[ -f "/Users/shriram/greenops-advisor/frontend/.env.production" ]]; then
    echo "✅ .env.production file exists"
    echo "Contents:"
    cat /Users/shriram/greenops-advisor/frontend/.env.production
else
    echo "❌ .env.production file not found"
fi

echo ""
echo "2. Checking local development environment variables..."
echo "----------------------------------------"

if [[ -f "/Users/shriram/greenops-advisor/frontend/.env.local" ]]; then
    echo "✅ .env.local file exists"
    echo "Contents:"
    cat /Users/shriram/greenops-advisor/frontend/.env.local
else
    echo "❌ .env.local file not found"
fi

echo ""
echo "3. Verifying required variables..."
echo "----------------------------------------"

# Check NEXT_PUBLIC_API_URL in production
if grep -q "NEXT_PUBLIC_API_URL" /Users/shriram/greenops-advisor/frontend/.env.production; then
    API_URL=$(grep "NEXT_PUBLIC_API_URL" /Users/shriram/greenops-advisor/frontend/.env.production | cut -d'=' -f2)
    if [[ "$API_URL" != "https://your-hf-space-url.hf.space" ]]; then
        echo "✅ NEXT_PUBLIC_API_URL is properly configured: $API_URL"
    else
        echo "❌ NEXT_PUBLIC_API_URL is still using placeholder value"
    fi
else
    echo "❌ NEXT_PUBLIC_API_URL not found in .env.production"
fi

# Check Supabase variables
if grep -q "NEXT_PUBLIC_SUPABASE_URL" /Users/shriram/greenops-advisor/frontend/.env.production; then
    echo "✅ NEXT_PUBLIC_SUPABASE_URL is configured"
else
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.production"
fi

if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" /Users/shriram/greenops-advisor/frontend/.env.production; then
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is configured"
else
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.production"
fi

echo ""
echo "4. Checking Hugging Face Space configuration..."
echo "----------------------------------------"

cd /Users/shriram/greenops-advisor
HF_REMOTE=$(git remote get-url hf 2>/dev/null)
if [[ -n "$HF_REMOTE" ]]; then
    echo "✅ Hugging Face remote configured: $HF_REMOTE"
    # Extract space name from remote URL - format: https://huggingface.co/spaces/USERNAME/SPACENAME
    # Convert to: https://USERNAME-SPACENAME.hf.space
    HF_URL_PART=$(echo "$HF_REMOTE" | sed -E 's/.*\/spaces\/(.+)\.git/\1/')
    EXPECTED_URL="https://${HF_URL_PART//\//\-}.hf.space"
    echo "Expected API URL format: $EXPECTED_URL"
    
    # Check if this matches our configured URL
    if [[ "$API_URL" == "$EXPECTED_URL" ]]; then
        echo "✅ API URL matches Hugging Face Space configuration"
    else
        echo "⚠️  API URL does not match Hugging Face Space configuration"
        echo "   Current: $API_URL"
        echo "   Expected: $EXPECTED_URL"
    fi
else
    echo "❌ Hugging Face remote not configured"
fi

echo ""
echo "=== Verification Complete ==="