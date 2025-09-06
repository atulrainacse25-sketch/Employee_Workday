import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Use VITE_BACKEND_URL in dev to proxy API requests to backend
      '/api': process.env.VITE_BACKEND_URL || 'http://localhost:5000',
    },
  },
});
