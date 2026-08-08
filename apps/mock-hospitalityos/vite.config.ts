import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Production Netlify ships under /hos/; local dev uses /. */
const base = process.env.HOS_BASE || "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5180,
    cors: true,
  },
});
