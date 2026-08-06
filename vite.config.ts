import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
    },
  },
  test: {
    include: ['apps/**/test/**/*.test.ts'],
  },
  lint: {
    ignorePatterns: ['**/dist/**', '**/routeTree.gen.ts'],
  },
  fmt: {
    ignorePatterns: ['**/routeTree.gen.ts'],
    semi: true,
    singleQuote: true,
  },
});
