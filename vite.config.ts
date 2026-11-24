/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('jspdf')) return 'pdf'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('dexie')) return 'db'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'react-vendor'
          }
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('date-fns')) return 'dates'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
