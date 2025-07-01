import { defineConfig } from 'vite';
import { join } from 'path';

export default defineConfig({
  build: {
    outDir: 'out',
    emptyOutDir: false,
    lib: { 
      entry: 'src/main.ts', 
      formats: ['cjs'],
      fileName: () => 'main.js'  // This ensures the output is named main.js
    },
    rollupOptions: {
      external: ['electron']
    }
  },
  resolve: { alias: { '@': join(__dirname, 'src') } }
});
