#!/bin/bash

# Echoes of Tomorrow - Quick Start Script

set -e

echo "🎮 Echoes of Tomorrow - Containerized Setup"
echo "============================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install it:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

# Create data directory
mkdir -p data

echo "🐳 Starting containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for Ollama to be ready..."
echo "   (First run will download ~2GB model - this may take a few minutes)"
echo ""

# Wait for Ollama
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done

echo ""
echo ""
echo "✅ Echoes of Tomorrow is ready!"
echo ""
echo "🌐 Open your browser: http://localhost:3000"
echo ""
echo "📊 Status:"
echo "   App:     http://localhost:3000"
echo "   Ollama:  http://localhost:11434"
echo ""
echo "🛑 To stop: docker-compose down"
echo "🗑️  To reset (removes saves): docker-compose down -v"
echo ""

# Try to open browser (works on most systems)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v start &> /dev/null; then
    start http://localhost:3000
fi
