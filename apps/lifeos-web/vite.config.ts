import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "LifeOS",
        short_name: "LifeOS",
        description: "Your universal LifeOS shell for TrustID ecosystem experiences",
        theme_color: "#0d7a6f",
        background_color: "#eef2f5",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "lifestyle"],
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:8790\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "lifeos-api",
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkFirst",
            options: {
              cacheName: "lifeos-api-proxy",
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8790",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
