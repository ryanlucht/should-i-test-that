import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { comlink } from 'vite-plugin-comlink';

export default defineConfig({
  plugins: [
    comlink(),  // Must be before react() per 05-RESEARCH.md
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    plugins: () => [comlink()],
  },
});
