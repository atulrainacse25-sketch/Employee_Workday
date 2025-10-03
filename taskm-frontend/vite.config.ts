import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Optimize dependencies for faster startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lucide-react',
      'framer-motion',
      'date-fns',
      'recharts',
      'react-hook-form',
      'react-markdown'
    ],
    force: true, // Force re-optimize deps
  },
  
  server: {
    host: '127.0.0.1', // Use specific IP instead of localhost
    port: 5173,
    open: false, // Don't auto-open browser to speed up startup
    cors: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    // Enable file system watching optimization
    watch: {
      usePolling: false,
      interval: 100,
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize build performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'framer-motion'],
        },
      },
    },
    // Increase chunk size limit to reduce warnings
    chunkSizeWarningLimit: 600,
  },
  
  base: process.env.VITE_BASE_URL || '/',
  
  // Enable faster resolving
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  
  // Performance optimizations
  esbuild: {
    // Faster builds
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});
