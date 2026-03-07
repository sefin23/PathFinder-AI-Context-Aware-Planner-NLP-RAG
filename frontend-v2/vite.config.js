import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/life-events': 'http://localhost:8000',
      '/rag': 'http://localhost:8000',
      '/tasks': 'http://localhost:8000',
      '/workflows': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
    },
  },
})
