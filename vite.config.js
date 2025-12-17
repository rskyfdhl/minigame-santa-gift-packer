import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Clear cache on build
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Add hash to filenames to bust cache
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
    // Force rebuild
    emptyOutDir: true,
  },
  // Clear dev cache
  server: {
    fs: {
      strict: true,
    },
  },
});
