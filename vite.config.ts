import { defineConfig, type Plugin } from 'vite';
import { handle } from './api/handler.ts';

// En dev, /api/<nom>.svg est servi par le même handler que l'API Node.
const api = (): Plugin => ({
  name: 'mochikao-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!handle(req, res)) next();
    });
  },
});

export default defineConfig({
  root: 'site',
  plugins: [api()],
  build: {
    outDir: '../dist-site',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: { input: { main: 'site/index.html', editor: 'site/editor.html' } },
  },
});
