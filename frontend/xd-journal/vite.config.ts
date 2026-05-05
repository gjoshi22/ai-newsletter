import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

const cwd = process.cwd();
const appRoot = fs.existsSync(path.join(cwd, "src", "main.tsx"))
  ? cwd
  : path.resolve(cwd, "frontend/xd-journal");
const workspaceRoot = path.resolve(appRoot, "../..");

export default defineConfig(async ({ command }) => {
  const replitDevPlugins = command === "serve"
    ? [
        await import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
        ...(process.env.REPL_ID !== undefined
          ? [
              await import("@replit/vite-plugin-cartographer").then((m) =>
                m.cartographer({
                  root: path.resolve(appRoot, ".."),
                }),
              ),
              await import("@replit/vite-plugin-dev-banner").then((m) =>
                m.devBanner(),
              ),
            ]
          : []),
      ]
    : [];

  return {
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...replitDevPlugins,
  ],
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
      "@assets": path.resolve(workspaceRoot, "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: appRoot,
  build: {
    outDir: path.resolve(appRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  };
});
