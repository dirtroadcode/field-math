// Assemble the single-file embeddable index.html from the shell, the
// stylesheet, and the pure modules. ESM `import`/`export` keywords are
// stripped so the modules paste cleanly into one classic <script> block.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Return the assembled artifact without touching disk, so tests can compare it
// against the committed index.html.
export function build() {
  const template = readFileSync(join(root, "src/template.html"), "utf8");

  return template.replace(/\/\*(__STYLE__|__INLINE:(.+?)__)\*\//g, (_, kind, spec) => {
    if (kind === "__STYLE__") return readFileSync(join(root, "src/styles.css"), "utf8");
    const code = readFileSync(join(root, spec.trim()), "utf8");
    return code
      // inline the module's own imports too (election.js is inlined first)
      .replace(/^import .+;$/gm, "")
      .replace(/^export (const|let|var|function) /gm, "$1 ");
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(join(root, "index.html"), build());
  console.log("built index.html");
}
