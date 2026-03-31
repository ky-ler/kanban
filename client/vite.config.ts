import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react({ babel: { plugins: ["babel-plugin-react-compiler"] } }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@lexical/") || id.includes("/lexical/"))
            return "lexical";
          if (id.includes("@tabler/icons-react")) return "icons";
          if (id.includes("@dnd-kit/")) return "dnd";
          if (
            id.includes("@tanstack/react-query") ||
            id.includes("@tanstack/react-router") ||
            id.includes("@tanstack/react-form")
          )
            return "tanstack";
          if (id.includes("/react/") || id.includes("/react-dom/"))
            return "react-vendor";
        },
      },
    },
  },
});
