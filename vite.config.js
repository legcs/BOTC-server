import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { attachRelay } from './server/relay.mjs'

// Relais multijoueur sur le même port que l'application
const relay = () => ({
  name: 'botc-relay',
  configureServer(server) {
    if (server.httpServer) attachRelay(server.httpServer)
  },
  configurePreviewServer(server) {
    attachRelay(server.httpServer)
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), relay()],
})
