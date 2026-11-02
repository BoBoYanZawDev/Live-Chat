import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BACKEND_URL = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND_URL,
      '/uploads': BACKEND_URL,
      '/socket.io': { target: BACKEND_URL, ws: true },
    },
  },
});
