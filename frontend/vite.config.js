import { defineConfig } from 'vite'

export default defineConfig({
  // Vite can transform .jsx files directly. We intentionally avoid the
  // optional React plugin here so a clean npm install does not depend on it.
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 5173,
  },
})
