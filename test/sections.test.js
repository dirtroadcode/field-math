// The page is the timeline console and nothing else: the two summary sections
// that used to sit under it restated numbers the console already owns.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../build.mjs";

const html = build();

test("the recruiting and labor sections are gone", () => {
  for (const gone of [
    "Volunteer recruiting",
    "Recruits and losses",
    "The labor",
    "What the pass costs",
    "statgrid",
    "o-table",
    "o-retention",
    "o-universe",
    "o-hours",
    "o-gotv",
    "o-volunteers-start",
    "o-volunteers-final",
    "o-volunteers-steady",
  ]) {
    assert.ok(!html.includes(gone), `${gone} still ships`);
  }
});
