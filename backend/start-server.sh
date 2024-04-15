#!/bin/bash

# Start Server Script
# This script ensures a clean start of the API server

echo "🔍 Checking for existing server processes..."

# Kill any existing api-server processes
pkill -f "node api-server.js" && echo "✅ Stopped existing server" || echo "✅ No existing server found"

# Wait a moment for the port to be released
sleep 1

# Clear the log file
> api-server.log

echo "🚀 Starting API server..."
echo "📝 Logs will be written to api-server.log"
echo "🌐 Server will run on http://localhost:3001"
echo ""

# Start the server and redirect output to log file
node api-server.js > api-server.log 2>&1 &

# Get the process ID
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Check if the server is running
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo "📋 View logs: tail -f backend/api-server.log"
    echo "🛑 Stop server: pkill -f 'node api-server.js'"
    echo ""
    # Show the startup logs
    tail -20 api-server.log
else
    echo "❌ Server failed to start. Check api-server.log for errors:"
    cat api-server.log
    exit 1
fi
