#!/bin/bash

# Check status of all servers

echo "📊 Crypto Payments Server Status"
echo "=================================================="
echo ""

# Check backend
echo "🔧 Backend (Port 3001):"
if lsof -i :3001 | grep LISTEN > /dev/null 2>&1; then
    PID=$(lsof -ti:3001)
    echo "  ✅ Running (PID: $PID)"
    if curl -s http://localhost:3001/ > /dev/null 2>&1; then
        echo "  ✅ Responding to requests"
    else
        echo "  ⚠️  Port open but not responding"
    fi
else
    echo "  ❌ Not running"
fi

echo ""

# Check frontend
echo "🎨 Frontend:"
FRONTEND_RUNNING=false

if lsof -i :5173 | grep LISTEN > /dev/null 2>&1; then
    PID=$(lsof -ti:5173)
    echo "  ✅ Running on port 5173 (PID: $PID)"
    FRONTEND_RUNNING=true
elif lsof -i :5174 | grep LISTEN > /dev/null 2>&1; then
    PID=$(lsof -ti:5174)
    echo "  ✅ Running on port 5174 (PID: $PID)"
    FRONTEND_RUNNING=true
else
    echo "  ❌ Not running"
fi

echo ""
echo "=================================================="

if [ "$FRONTEND_RUNNING" = true ] && lsof -i :3001 | grep LISTEN > /dev/null 2>&1; then
    echo "✅ All services running"
    echo ""
    echo "🌐 Access your app:"
    if lsof -i :5173 | grep LISTEN > /dev/null 2>&1; then
        echo "   Frontend: http://localhost:5173"
    else
        echo "   Frontend: http://localhost:5174"
    fi
    echo "   Backend:  http://localhost:3001"
else
    echo "⚠️  Some services are not running"
    echo ""
    echo "💡 Start servers with: ./start-dev.sh"
fi

echo "=================================================="
