#!/bin/bash

# Stop Server Script
# This script stops the API server

echo "🛑 Stopping API server..."

pkill -f "node api-server.js"

if [ $? -eq 0 ]; then
    echo "✅ Server stopped successfully"
else
    echo "ℹ️  No server process found"
fi

# Also check if the port is still in use
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  Port 3001 is still in use. Force killing..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null
    echo "✅ Port 3001 released"
else
    echo "✅ Port 3001 is free"
fi
