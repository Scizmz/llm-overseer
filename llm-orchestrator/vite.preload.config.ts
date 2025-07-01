import { defineConfig } from 'vite';
import { join } from 'path';

export default defineConfig({
  build: {
    outDir: 'out/preload',
    lib: { entry: 'src/preload.ts', formats: ['cjs'] }
  },
  resolve: { alias: { '@': join(__dirname, 'src') } }
});
