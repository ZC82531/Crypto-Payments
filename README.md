# Crypto Payment Gateway

A full-stack cryptocurrency payment platform enabling merchants to accept crypto payments with automatic fiat conversion.


## Live Deployment

- **Website**: [https://crypto-pmts.vercel.app/login](https://crypto-pmts.vercel.app/login)

> **Note:** This project is deployed on Vercel.

## Features

- Merchant dashboard with payment tracking
- QR code generation for customer payments
- Secure business profile management with encrypted bank details
- Coinbase Commerce integration for crypto payment invoices
- Real-time payment status updates
- Row-level security with Supabase

## Tech Stack

**Frontend**: React 18, Vite, React Router  
**Backend**: Node.js, Express  
**Database**: Supabase (PostgreSQL)  
**Authentication**: Supabase Auth  
**Payment Processing**: Coinbase Commerce (crypto invoices)  
**Security**: AES-256-CBC encryption, JWT tokens, CORS protection

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Coinbase Commerce account

### Installation

```bash
# Clone repository
git clone https://github.com/ZC82531/Crypto-Payments.git
cd Crypto-Payments

# Install dependencies
npm install
cd backend && npm install && cd ..
```

### Environment Setup

**Frontend (.env in root)**
```bash
VITE_API_URL=https://crypto-payments.onrender.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_COINBASE_API_KEY=your_coinbase_api_key
```

**Backend (backend/.env)**
```bash
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,https://crypto-mobile-pay.netlify.app
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ENCRYPTION_KEY=your_64_char_hex_encryption_key
MASTER_KEY=your_master_key
COINBASE_API_KEY=your_coinbase_api_key
NODE_ENV=development
```

### Development

```bash
# Start both frontend and backend
npm start

# Stop all servers
npm stop

# Check server status
npm run status
```

- Frontend runs on http://localhost:5173
- Backend API runs on http://localhost:3001

## Production Build

```bash
# Build frontend
npm run build

# Preview production build locally
npm run preview
```

## Deployment

### Automated Deployment (GitHub Actions)

Push to `main` branch triggers automatic deployment:
- **Frontend**: Builds and deploys to Netlify
- **Backend**: Auto-deploys to Render

### Manual Deployment

**Netlify (Frontend)**
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables in Netlify dashboard

**Render (Backend)**
1. Connect GitHub repository
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `node api-server.js`
5. Add environment variables in Render dashboard

## API Endpoints

Base URL: `https://crypto-payments.onrender.com/api`

- `POST /business-profile` - Create/update business profile
- `GET /business-profile` - Get authenticated user's profile
- `GET /public/business-profile/:email` - Get public business info
- `POST /payments/create` - Create new payment charge
- `GET /payments/history` - Get payment history

## Project Structure

```
Crypto-Payments/
├── src/                          # React frontend
│   ├── config/
│   │   └── api.js               # API configuration
│   ├── dashboard.jsx            # Merchant dashboard
│   ├── CustomerPage.jsx         # Payment entry page
│   ├── PaymentPage.jsx          # Payment processing
│   └── ...
├── backend/
│   ├── api-server.js            # Express server
│   ├── security/
│   │   ├── encryption.js        # Data encryption
│   │   ├── keyManager.js        # Key management
│   │   └── middleware.js        # Auth middleware
│   └── ...
├── .github/workflows/
│   └── deploy.yml               # CI/CD pipeline
├── public/
│   └── _redirects               # Netlify SPA routing
└── package.json
```

## Security Features

- AES-256-CBC encryption for sensitive data
- Supabase Row Level Security policies
- JWT-based authentication
- CORS protection with origin whitelist
- Environment-based configuration
- Secure key management

## Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start frontend and backend |
| `npm stop` | Stop all servers |
| `npm run status` | Check server status |
| `npm run dev` | Frontend development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Troubleshooting

**Port conflicts**
```bash
npm stop
# Or manually kill processes
lsof -ti:5173 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**CORS errors**
- Verify `CORS_ORIGINS` includes your frontend URL
- Ensure URLs include protocol (http:// or https://)
- Restart backend after environment changes

**Environment variables not loading**
- Frontend: Rebuild after changes (`npm run build`)
- Backend: Restart server after changes
- Variables must start with `VITE_` for frontend access

**Build issues**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## Contributing

Pull requests welcome. For major changes, open an issue first to discuss proposed changes.

---

**Production URL**
- Website: https://crypto-mobile-pay.netlify.app/login
