# Server Management Guide

## Quick Commands

### Starting the Server

**Option 1: Background Mode (Recommended)**
```bash
cd backend
./start-server.sh
# or
npm run start:bg
```

**Option 2: Foreground Mode (with output)**
```bash
cd backend
npm start
```

**Option 3: Development Mode (auto-restart)**
```bash
cd backend
npm run dev
```

### Stopping the Server

```bash
cd backend
./stop-server.sh
# or
npm run stop
```

### Restarting the Server

```bash
cd backend
npm run restart
```

### Viewing Logs

```bash
cd backend
npm run logs
# or
tail -f api-server.log
```

### Checking Server Status

```bash
# Check if running
lsof -i :3001 | grep LISTEN

# Test the API
curl http://localhost:3001/
```

## Common Issues

### Issue: "Address already in use"

**Problem:** The server is already running on port 3001

**Solution:**
```bash
cd backend
./stop-server.sh
./start-server.sh
```

### Issue: Server won't start

**Check 1:** Verify .env file exists
```bash
cd backend
ls -la .env
```

**Check 2:** Check the logs
```bash
cd backend
cat api-server.log
```

**Check 3:** Initialize the database
```bash
cd backend
npm run db:init
```

### Issue: Port 3001 is blocked

**Solution:** Use a different port
```bash
PORT=3002 node api-server.js
```

## Server Endpoints

### Public Endpoints (No Authentication)
- `GET /` - Health check
- `GET /api/public/business-profile/:email` - Get business profile
- `POST /api/log-payment` - Log payment
- `GET /api/debug/table-status` - Database status

### Protected Endpoints (Requires Authentication)
- `GET /api/business-profile` - Get user's business profile
- `POST /api/business-profile` - Create/update business profile
- `GET /api/payments/history` - Get payment history
- `POST /api/payments/create` - Create payment charge

## Environment Variables

Required in `backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ENCRYPTION_KEY=your_32_byte_hex_key
PORT=3001
```

## Tips

1. **Always use the scripts** - They handle cleanup and port conflicts
2. **Check logs** - If something fails, check `api-server.log`
3. **Background mode** - Best for development, keeps terminal free
4. **Dev mode** - Use `npm run dev` when actively coding (auto-restart)
