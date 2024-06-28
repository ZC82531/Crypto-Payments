#!/bin/bash

# Stop all development servers

echo "🛑 Stopping Crypto Payments Development Environment"
echo "=================================================="

# Stop backend
if pkill -f "node api-server.js" 2>/dev/null; then
    echo "✅ Backend server stopped"
else
    echo "ℹ️  No backend server running"
fi

# Stop frontend
if pkill -f "vite" 2>/dev/null; then
    echo "✅ Frontend server stopped"
else
    echo "ℹ️  No frontend server running"
fi

# Force kill any stuck processes on ports
if lsof -ti:3001 > /dev/null 2>&1; then
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    echo "✅ Port 3001 released"
fi

if lsof -ti:5173 > /dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo "✅ Port 5173 released"
fi

if lsof -ti:5174 > /dev/null 2>&1; then
    lsof -ti:5174 | xargs kill -9 2>/dev/null
    echo "✅ Port 5174 released"
fi

echo "=================================================="
echo "✅ All servers stopped"
