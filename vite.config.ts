import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: process.env.TEMPO === "true" ? "0.0.0.0" : "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    allowedHosts: process.env.TEMPO === "true" ? true : undefined,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Three.js + VRM (heaviest — isolated so it lazy-loads separately)
          "vendor-three": ["three"],
          "vendor-vrm": ["@pixiv/three-vrm", "@pixiv/three-vrm-animation"],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // UI libs
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tooltip", "@radix-ui/react-select", "@radix-ui/react-tabs", "lucide-react", "sonner"],
          // Query + forms
          "vendor-query": ["@tanstack/react-query", "react-hook-form", "@hookform/resolvers", "zod"],
          // Animation
          "vendor-gsap": ["gsap"],
        },
      },
    },
  },
}));
