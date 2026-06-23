import { defineConfig } from 'vite';
import { resolve } from 'path';

// We use a single config but the "build" script runs vite twice
// with different --mode flags to produce separate IIFE bundles
export default defineConfig(({ mode }) => {
  const isContent = mode === 'content';
  const isBackground = mode === 'background';

  const entry = isContent
    ? resolve(__dirname, 'src/content/index.ts')
    : resolve(__dirname, 'src/background/index.ts');

  const fileName = isContent ? 'content.js' : 'background.js';

  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: isContent, // Only clear on first build (content)
      sourcemap: true,
      lib: {
        entry,
        name: isContent ? 'PoE2TradeContent' : 'PoE2TradeBackground',
        formats: ['iife'],
        fileName: () => fileName,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
      target: 'es2020',
      minify: false,
    },
  };
});
