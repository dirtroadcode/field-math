// Watch the page sources and rebuild the artifact on every change. A plain
// `node --watch` won't work here: build.mjs reads its inputs with readFileSync,
// so they aren't module dependencies Node can track.
import { watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(fileURLToPath(import.meta.url));
const srcDir = join(root, "src");

function build() {
  const result = spawnSync(process.execPath, [join(root, "build.mjs")], { stdio: "inherit" });
  if (result.status !== 0) console.error("build failed — fix the error above and save again");
}

build();

// Editors write in bursts, so coalesce events into one rebuild.
let timer = null;
watch(srcDir, () => {
  clearTimeout(timer);
  timer = setTimeout(build, 60);
});

console.log("watching src/ — edit a source and index.html rebuilds");
