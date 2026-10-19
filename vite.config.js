import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          blockly: [
            "blockly/core",
            "blockly/blocks",
            "blockly/python",
            "blockly/msg/hu",
            "blockly/msg/en",
          ],
          editor: ["codemirror", "@codemirror/lang-python"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
  server: { allowedHosts: ["localhost", "127.0.0.1"] },
});
