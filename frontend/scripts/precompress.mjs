// Writes .gz siblings for text assets in dist/ so nginx can serve them with `gzip_static on`
// instead of compressing on every request.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import zlib from "node:zlib";

const gzip = promisify(zlib.gzip);
const DIST = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const EXTENSIONS = new Set([".js", ".css", ".html", ".svg", ".json", ".txt", ".xml", ".webmanifest"]);
const MIN_BYTES = 1024;

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let count = 0;
let saved = 0;
for await (const file of walk(DIST)) {
  if (!EXTENSIONS.has(path.extname(file))) continue;
  const data = await fs.readFile(file);
  if (data.length < MIN_BYTES) continue;
  const compressed = await gzip(data, { level: zlib.constants.Z_BEST_COMPRESSION });
  if (compressed.length >= data.length) continue;
  await fs.writeFile(`${file}.gz`, compressed);
  count += 1;
  saved += data.length - compressed.length;
}
console.log(`precompress: ${count} files, ${(saved / 1024).toFixed(0)} KiB saved`);
