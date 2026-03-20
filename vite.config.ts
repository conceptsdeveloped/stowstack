/// <reference types="vitest" />
import path from "path";
import { createRequire } from "module";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, type Plugin, loadEnv } from "vite";
import { ServerResponse } from "http";

const require = createRequire(import.meta.url);

/**
 * Vite plugin that serves Vercel-style serverless functions from api/ directory
 * during local development. Mirrors Vercel's routing: /api/foo → api/foo.js
 *
 * Returns a post-hook so the middleware is registered BEFORE Vite's transform
 * pipeline, preventing /api/* from being served as ES modules.
 */
function vercelApiPlugin(): Plugin {
  return {
    name: "vercel-api-dev",
    configureServer(server) {
      // Load all .env files into process.env for serverless function handlers
      const env = loadEnv("development", path.resolve(__dirname), "");
      Object.assign(process.env, env);

      // Return a function — Vite calls it AFTER internal middlewares are set up,
      // but we use server.middlewares.use at the TOP via the returned callback
      // Actually: returning from configureServer adds middleware AFTER.
      // To add BEFORE, we push directly here and do NOT return.
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith("/api/")) return next();

        const [pathPart, queryString] = req.url.replace(/^\/api\//, "").split("?");
        const fnName = pathPart;
        const fnPath = path.resolve(__dirname, "api", `${fnName}.js`);

        // Parse query string into req.query (Vercel-compatible)
        const queryParams: Record<string, string> = {};
        if (queryString) {
          for (const [k, v] of new URLSearchParams(queryString)) {
            queryParams[k] = v;
          }
        }
        req.query = queryParams;

        // Check file exists
        try {
          require.resolve(fnPath);
        } catch {
          return next();
        }

        try {
          // Use Vite's SSR module loader — runs the module in Node context
          // without browser transforms, but still resolves npm imports
          const mod = await server.ssrLoadModule(
            `/api/${fnName}.js`,
          );
          const handler = mod.default;
          if (typeof handler !== "function") return next();

          // Parse JSON body for POST/PATCH/PUT
          if (["POST", "PATCH", "PUT"].includes(req.method)) {
            await new Promise<void>((resolve) => {
              let body = "";
              req.on("data", (chunk: Buffer) => {
                body += chunk.toString();
              });
              req.on("end", () => {
                try {
                  req.body = JSON.parse(body);
                } catch {
                  req.body = {};
                }
                resolve();
              });
            });
          }

          // Wrap res to add Vercel-like .json() and .status() helpers
          const fakeRes = createFakeRes(res);
          await handler(req, fakeRes);
        } catch (err: any) {
          console.error(`[vercel-api-dev] Error in /api/${fnName}:`, err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      });
    },
  };
}

function createFakeRes(res: ServerResponse) {
  let statusCode = 200;
  const headers: Record<string, string> = {};

  const fakeRes: any = {
    setHeader(key: string, val: string) {
      headers[key] = val;
      return fakeRes;
    },
    status(code: number) {
      statusCode = code;
      return fakeRes;
    },
    json(data: any) {
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    },
    send(body?: any) {
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      res.writeHead(statusCode);
      res.end(body || "");
    },
    end(body?: string) {
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      res.writeHead(statusCode);
      res.end(body || "");
    },
    get headersSent() {
      return res.headersSent;
    },
  };
  return fakeRes;
}

export default defineConfig({
  plugins: [
    vercelApiPlugin(),
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      includeAssets: ["favicon.svg", "og-image.png", "robots.txt"],
      manifest: {
        name: "StowStack by StorageAds.com — Demand Engine for Self-Storage",
        short_name: "StowStack",
        description:
          "Full-funnel acquisition system for self-storage operators",
        theme_color: "#16a34a",
        background_color: "#0f172a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Lead Pipeline",
            short_name: "Leads",
            url: "/admin?tab=pipeline",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "New Audit",
            short_name: "Audit",
            url: "/#audit",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
          },
        ],
        categories: ["business", "productivity"],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
