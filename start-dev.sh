#!/bin/bash

# Unified Development Startup Script
# Starts both backend and frontend servers

set -e  # Exit on error

echo "🚀 Starting Crypto Payments Development Environment"
echo "=================================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    pkill -f "node api-server.js" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Step 1: Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node api-server.js" 2>/dev/null && echo "  ✓ Stopped old backend" || echo "  ✓ No old backend found"
pkill -f "vite" 2>/dev/null && echo "  ✓ Stopped old frontend" || echo "  ✓ No old frontend found"
sleep 1

# Step 2: Initialize database
echo ""
echo "🗄️  Initializing database..."
cd backend
if node init-database.js; then
    echo "  ✅ Database initialized"
else
    echo "  ⚠️  Database initialization had issues (may be okay if already set up)"
fi
cd ..

# Step 3: Start backend server
echo ""
echo "🔧 Starting backend API server..."
cd backend
node api-server.js > api-server.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "  ✅ Backend running on http://localhost:3001 (PID: $BACKEND_PID)"
else
    echo "  ❌ Backend failed to start. Check backend/api-server.log"
    cat backend/api-server.log
    exit 1
fi

# Step 4: Start frontend server
echo ""
echo "🎨 Starting frontend development server..."
npx vite &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    # Try to determine which port Vite is using
    if lsof -i :5173 > /dev/null 2>&1; then
        FRONTEND_PORT=5173
    elif lsof -i :5174 > /dev/null 2>&1; then
        FRONTEND_PORT=5174
    else
        FRONTEND_PORT="unknown"
    fi
    
    if [ "$FRONTEND_PORT" != "unknown" ]; then
        echo "  ✅ Frontend running on http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
    else
        echo "  ✅ Frontend running (PID: $FRONTEND_PID)"
    fi
else
    echo "  ❌ Frontend failed to start"
    exit 1
fi

# Step 5: Show status
echo ""
echo "=================================================="
echo "✅ All servers started successfully!"
echo "=================================================="
echo ""
echo "🌐 Frontend: http://localhost:${FRONTEND_PORT:-5173}"
echo "🔧 Backend:  http://localhost:3001"
echo "📝 Logs:     tail -f backend/api-server.log"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=================================================="
echo ""

# Keep script running and show logs
wait $FRONTEND_PID
