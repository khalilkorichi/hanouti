import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // base: './' makes all asset URLs in index.html RELATIVE (e.g.
  // ./assets/index.js instead of /assets/index.js). Required for Electron
  // where index.html is loaded via file:// — absolute paths get resolved
  // against the drive root and fail to find the bundle, leaving the user
  // staring at a black window. Web/dev builds work fine with relative too.
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
