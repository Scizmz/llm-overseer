import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out/renderer',
    emptyOutDir: true,
    rollupOptions: { input: 'index.html' }
  },
  resolve: { alias: { '@': join(__dirname, 'src') } },
  define: {
    // Define process.env for the renderer process
    'process.env': {
      REACT_APP_WS_URL: JSON.stringify('http://localhost:3000'),
      NODE_ENV: JSON.stringify('development')
    }
  }
});
