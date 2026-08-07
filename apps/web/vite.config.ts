import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart(),
    // Nitro is a deployment adapter; keep it out of Vite+ test and dev runs.
    ...(command === 'build' ? [nitro()] : []),
    viteReact(),
    tailwindcss(),
  ],
}));
