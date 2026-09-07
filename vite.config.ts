import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // Absolute base: the app is a client-side-routed SPA, so assets must resolve
  // from the root no matter how deep the URL is (e.g. /song/<uuid>).
  base: '/',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Vendor code changes far less often than app code; splitting it keeps
        // the cached chunks stable across deploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/**/*.test.ts'],
    // Playwright specs drive a browser and are run by `npm run test:e2e`.
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
