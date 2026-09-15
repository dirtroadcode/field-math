import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "../build.mjs";

test("index.html is the generated artifact, never hand-edited", () => {
  const committed = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(committed, build());
});

test("every stylesheet selector stays scoped under #drc", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    const selector = match[1].trim();
    if (!selector || selector.startsWith("@")) continue;
    for (const part of selector.split(",")) {
      assert.ok(part.trim().startsWith("#drc"), `unscoped selector: ${part.trim()}`);
    }
  }
});
