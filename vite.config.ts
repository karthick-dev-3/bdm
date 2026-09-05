import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { app } from './server/api.js';

function sqliteBackendPlugin(): Plugin {
  return {
    name: 'sqlite-rest-backend',
    configureServer(server) {
      // Connect SQLite Express API directly to Vite dev server middlewares
      server.middlewares.use(app);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), sqliteBackendPlugin()],
  server: {
    port: 3000,
    open: false
  }
});
