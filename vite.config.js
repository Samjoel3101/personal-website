import { defineConfig } from 'vite';

// Relative base so the built site works from a repository subpath, which is
// what GitHub Pages serves by default.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    // three.js is one deliberate 630 kB chunk (159 kB gzipped). Splitting it
    // further would only trade one request for several of the same total size,
    // so the default warning is noise here rather than a signal.
    chunkSizeWarningLimit: 700,
    // Three.js is large and stable; splitting it out means a content change to
    // our own code does not invalidate it in the browser cache.
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
