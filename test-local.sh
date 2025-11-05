#!/bin/bash
# Quick test script for local development

echo "🔍 Checking Docker network for Jellyfin..."
NETWORK=$(docker inspect jellyfin 2>/dev/null | grep -m 1 '"NetworkMode"' | cut -d'"' -f4)
if [ ! -z "$NETWORK" ]; then
    echo "✓ Found Jellyfin on network: $NETWORK"
else
    echo "⚠️  Jellyfin container not found or not running"
    echo "   Make sure Jellyfin is running first"
fi

echo ""
echo "📝 Checking .env file..."
if [ -f .env ]; then
    echo "✓ .env file exists"
    if grep -q "your_jellyfin_api_key_here" .env; then
        echo "⚠️  Warning: .env still has placeholder values"
        echo "   Please update with your actual API keys"
    fi
else
    echo "⚠️  .env file not found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo "   Please edit .env with your API keys"
    exit 1
fi

echo ""
echo "🏗️  Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting container (foreground mode for testing)..."
echo "   Press Ctrl+C to stop"
echo "   Watch for 'Playlist generation completed successfully!'"
echo ""
docker-compose up
