import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/background/index.ts',
      name: 'EcdashBackground',
      formats: ['es'],
      fileName: () => 'background.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
