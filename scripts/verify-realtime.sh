#!/bin/bash

# Script to verify real-time metrics functionality

echo "Verifying real-time metrics setup..."

# Check if required environment variables are set
if [[ -z "$NEXT_PUBLIC_API_URL" ]]; then
    echo "Warning: NEXT_PUBLIC_API_URL is not set"
    echo "Please set it to your deployed backend URL"
fi

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
    echo "Error: NEXT_PUBLIC_SUPABASE_URL is not set"
    exit 1
fi

if [[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
    echo "Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
    exit 1
fi

echo "Environment variables check passed"

# Test Supabase connection
echo "Testing Supabase connection..."
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/health" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  > /dev/null

if [[ $? -eq 0 ]]; then
    echo "Supabase connection successful"
else
    echo "Warning: Supabase connection test failed"
fi

echo "Real-time metrics verification complete"
echo "To test WebSocket connection, open the application in browser and check developer console"