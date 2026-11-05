import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Port 8000 is taken by Splunk on this machine, so the API runs on 8010 by default
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8010'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Forward API calls to the FastAPI backend (mbeyen) during development
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
