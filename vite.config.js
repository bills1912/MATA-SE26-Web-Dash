import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3')) return 'charts';
            if (id.includes('react')) return 'vendor';
            return 'deps';
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        // Proxy /api/... → backend:5000/api/...
        // Jangan rewrite, biarkan path utuh agar cocok dengan route Express
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
