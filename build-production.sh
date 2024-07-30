#!/bin/bash

# Production Build Script
# This script prepares your application for deployment

set -e  # Exit on error

echo "🏗️  Starting Production Build Process"
echo "======================================"
echo ""

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf backend/node_modules/.cache
echo "  ✅ Clean complete"

# Step 2: Install/update dependencies
echo ""
echo "📦 Installing frontend dependencies..."
npm install --production=false
echo "  ✅ Frontend dependencies installed"

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install --production=false
cd ..
echo "  ✅ Backend dependencies installed"

# Step 3: Run tests (if you have them)
echo ""
echo "🧪 Running tests..."
# npm test || echo "  ⚠️  No tests found (skipping)"

# Step 4: Build frontend
echo ""
echo "🔨 Building frontend..."

# Load environment variables from .env file
if [ -f .env ]; then
    echo "  📄 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Use npx to avoid calling npm run build (which would recurse)
npx vite build

if [ -d "dist" ]; then
    echo "  ✅ Frontend build successful"
    echo "  📊 Build size:"
    du -sh dist
else
    echo "  ❌ Frontend build failed"
    exit 1
fi

# Step 5: Test production build locally
echo ""
echo "🔍 Testing production build..."
echo "Starting preview server on http://localhost:4173"
echo "Press Ctrl+C when done testing"
echo ""
npm run preview &
PREVIEW_PID=$!

# Wait a bit for server to start
sleep 3

# Check if preview server is running
if ps -p $PREVIEW_PID > /dev/null 2>&1; then
    echo "  ✅ Preview server running (PID: $PREVIEW_PID)"
    echo ""
    echo "======================================"
    echo "🎉 Build Complete!"
    echo "======================================"
    echo ""
    echo "📁 Build output: ./dist"
    echo "🌐 Preview: http://localhost:4173"
    echo ""
    echo "Next steps:"
    echo "1. Test the preview thoroughly"
    echo "2. Press Ctrl+C to stop preview"
    echo "3. Deploy the 'dist' folder to your hosting platform"
    echo "4. Deploy backend separately to your API server"
    echo ""
    echo "Deployment platforms:"
    echo "  Frontend: Vercel, Netlify, Cloudflare Pages"
    echo "  Backend: Railway, Render, Heroku, DigitalOcean"
    echo ""
    
    # Keep preview running until user stops it
    wait $PREVIEW_PID
else
    echo "  ❌ Preview server failed to start"
    exit 1
fi
