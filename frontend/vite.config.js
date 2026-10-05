import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // bind mount do Docker Desktop no Windows nao propaga eventos de
    // filesystem pro container, entao o watcher precisa de polling
    watch: { usePolling: true },
  },
})
