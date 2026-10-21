// MapLibre 6 resolves its web worker relative to import.meta.url, which bundlers
// rewrite. Serving the worker from /public and calling setWorkerUrl avoids that.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "maplibre-gl");
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const outDir = join(root, "public", "vendor");

mkdirSync(outDir, { recursive: true });
copyFileSync(join(pkgDir, "dist", "maplibre-gl-worker.mjs"), join(outDir, "maplibre-gl-worker.mjs"));
console.log(`Copied maplibre-gl ${version} worker to public/vendor`);
