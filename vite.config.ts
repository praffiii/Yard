import { defineConfig } from 'vite-plus';

export default defineConfig({
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
