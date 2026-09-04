import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SERVICEOS_API_URL": JSON.stringify("http://localhost:8920"),
  },
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1,
  },
});
