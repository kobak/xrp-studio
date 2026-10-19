import { createApp } from "./app.js";
import { createStore } from "./store.js";
import { resolve } from "node:path";
import express from "express";
import { existsSync } from "node:fs";
try {
  process.loadEnvFile(".env");
} catch {}
const port = Number(process.env.PORT || 4173),
  production = process.env.NODE_ENV === "production";
const db = createStore(
  resolve(process.env.DATA_DIR || "data", "studio.sqlite"),
);
const app = createApp({
  db,
  clientId: process.env.GOOGLE_CLIENT_ID,
  origin: process.env.APP_ORIGIN || `http://localhost:${port}`,
  production,
});
const publicDir = resolve(production ? "dist" : "public");
// Only the public interpreter assets are CORS-readable by the opaque sandbox.
app.use(
  ["/pyodide", "/simulator-worker.js", "/simulator.py", "/sandbox.html"],
  (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
);
app.use(express.static(publicDir));
if (production) {
  if (!existsSync("dist/index.html")) throw Error("Run npm run build first");
  app.use(express.static("dist"));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`XRP Studio: http://localhost:${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
