import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: path.resolve(__dirname, "src-ui"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".."),
    },
  },
  build: {
    outDir: path.resolve(__dirname),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, "src-ui/ui.html"),
    },
  },
});
