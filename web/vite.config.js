import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: {
    // No source maps in production — reduces bundle size significantly
    sourcemap: false,
    // Raise warning limit to reduce noise; we handle it with manual chunks
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split large vendor libraries into separate lazily-loaded chunks.
        // This keeps the initial JS bundle small so the app starts faster.
        manualChunks(id) {
          // Core React runtime — always needed
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Routing
          if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) {
            return 'vendor-router';
          }
          // Core state, HTTP client, and theme helper — needed on landing page / initial load
          if (id.includes('node_modules/axios/') || id.includes('node_modules/zustand/') || id.includes('node_modules/next-themes/')) {
            return 'vendor-core';
          }
          // Animation library (motion) — heavy, only used by landing + a few pages
          if (id.includes('node_modules/motion/') || id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }
          // Charts — only used by analytics pages
          if (id.includes('node_modules/recharts/')) {
            return 'vendor-recharts';
          }
          // Rich text editor — only used by teacher question editor
          if (id.includes('node_modules/@tiptap/')) {
            return 'vendor-tiptap';
          }
          // Drag and drop — only used by question reorder
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'vendor-dnd';
          }
          // Math rendering — only used in question/module pages
          if (id.includes('node_modules/katex/')) {
            return 'vendor-katex';
          }
          // Table library
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-tanstack';
          }
          // Heavy Zip compression library — only used for downloading code/files
          if (id.includes('node_modules/jszip/')) {
            return 'vendor-jszip';
          }
          // Form validation schema library
          if (id.includes('node_modules/zod/')) {
            return 'vendor-zod';
          }
          // UI Component primitives — only used inside dashboard UIs
          if (id.includes('node_modules/@base-ui/react/')) {
            return 'vendor-baseui';
          }
          // Icon library — tree-shaken but heavy overall
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-lucide';
          }
          // Client-side image compression for avatars
          if (id.includes('node_modules/browser-image-compression/')) {
            return 'vendor-compression';
          }
          // Everything else from node_modules goes into a shared vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
});
