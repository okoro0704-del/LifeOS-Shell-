import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const host = process.env.TAURI_DEV_HOST;
const pkgVersion = process.env.npm_package_version || "1.0.0";
const webOrigin =
  (process.env.VITE_LIFEOS_WEB ?? "https://lifeosapp.getlifeos.app").replace(/\/$/, "");

/** Emit /ota.json so the Capacitor shell can detect web updates on launch. */
function otaManifestPlugin(): Plugin {
  return {
    name: "lifeos-ota-manifest",
    closeBundle() {
      const buildId = createHash("sha1")
        .update(`${pkgVersion}:${Date.now()}:${process.env.COMMIT_REF || process.env.GITHUB_SHA || ""}`)
        .digest("hex")
        .slice(0, 12);
      const outDir = join(process.cwd(), "dist");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, "ota.json"),
        JSON.stringify(
          {
            buildId,
            version: pkgVersion,
            builtAt: new Date().toISOString(),
            webOrigin,
          },
          null,
          2,
        ),
      );
    },
  };
}

export default defineConfig({
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  plugins: [
    react(),
    otaManifestPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "LifeOS",
        short_name: "LifeOS",
        description: "LifeOS — consume, patronize, and run your spaces from one shell",
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
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5175,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8790",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    // Tauri uses Chromium on Windows/macOS and WebKit on Linux.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  define: {
    "import.meta.env.VITE_SERVICEOS_API_URL": JSON.stringify(
      process.env.VITE_SERVICEOS_API_URL || process.env.SERVICEOS_API_URL || "http://localhost:8920",
    ),
  },
});
