import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import catalog from "./server/catalog.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-catalog-api",
      configureServer(server) {
        server.middlewares.use("/api/catalog", (req, res) => {
          void catalog(req, res);
        });
      },
    },
  ],
});
