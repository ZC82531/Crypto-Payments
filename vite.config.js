import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // Try next available port if 5173 is busy
    host: true, // Listen on all addresses
    open: false, // Don't auto-open browser
  },
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable in production for security
    rollupOptions: {
      output: {
        // Better cache busting with hash in filenames
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  }
})
