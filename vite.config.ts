import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use repository name for GitHub Pages deployment
// Repository name: LITHOVISION.1
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/LITHOVISION.1/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
})
