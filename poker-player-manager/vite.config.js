import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Enable client-side routing for development
    historyApiFallback: true,
  },
  preview: {
    // Enable client-side routing for preview builds
    historyApiFallback: true,
    host: '0.0.0.0',
    allowedHosts: [
      'pokernight.famylin.com',
      'poker-frontend-production-543f.up.railway.app'
    ]
  },
})
