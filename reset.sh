#!/bin/bash

# Echoes of Tomorrow - Reset Script (removes all data)

echo "🗑️  Resetting Echoes of Tomorrow..."
echo "   This will stop containers and remove all saves + AI models."
echo ""
read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
    echo ""
    echo "✅ Reset complete!"
    echo "   Run ./start.sh to start fresh."
else
    echo "Cancelled."
fi
