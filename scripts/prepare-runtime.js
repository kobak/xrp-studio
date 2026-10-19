import { mkdirSync, copyFileSync } from "node:fs";
mkdirSync("public/pyodide", { recursive: true });
for (const file of [
  "pyodide.mjs",
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
])
  copyFileSync(`node_modules/pyodide/${file}`, `public/pyodide/${file}`);
