import path from "path";
import { createRequire } from "module";
import react from "@vitejs/plugin-react";
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

        const fnName = req.url.replace(/^\/api\//, "").split("?")[0];
        const fnPath = path.resolve(__dirname, "api", `${fnName}.js`);

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
  plugins: [vercelApiPlugin(), react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
