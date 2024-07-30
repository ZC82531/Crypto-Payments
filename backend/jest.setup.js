// Prevent the express server from binding to a port during tests.
// api-server.js already guards listen() with: if (process.env.VERCEL !== '1')
process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';

// Minimal env vars so the server module loads without crashing.
process.env.ENCRYPTION_KEY =
  'f5e8d4c952eff5a79afccb2b757693f7969754393f7413442fda96ddefedb0c0';
// MASTER_KEY silences KeyManager's "generating new key" warning during tests.
process.env.MASTER_KEY =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.CORS_ORIGINS = 'http://localhost:5173';
