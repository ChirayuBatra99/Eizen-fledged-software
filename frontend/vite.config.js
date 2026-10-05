import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/auth": { target: "http://localhost:4000", changeOrigin: true },
      "/patients": { target: "http://localhost:4000", changeOrigin: true },
      "/medicines": { target: "http://localhost:4000", changeOrigin: true },
      "/visits": { target: "http://localhost:4000", changeOrigin: true },
      "/reports": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
