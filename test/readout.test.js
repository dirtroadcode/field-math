// The scrub readout is a day sheet: one row per knocker closed by a total, so
// the reader can see who did the work rather than only the campaign-wide sum.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../build.mjs";

const html = build();

test("the readout is a tally table with scoped headers", () => {
  assert.ok(html.includes('class="tally"'), "the tally table is missing");
  assert.ok(html.includes('id="o-scrub-readout"'), "the readout container is missing");
  for (const col of ["Conversations", "Confirmed", "Lit drops", "Hours", "Volunteers"]) {
    assert.ok(html.includes('scope="col">' + col + "<"), `${col} column header is missing`);
  }
  assert.ok(html.includes('class="sr-only">Knocker'), "the corner header needs a label");
  assert.ok(html.includes("scope=\"row\""), "the rows need scoped headers");
  assert.ok(html.includes("<tfoot>"), "the total row needs a footer");
  assert.ok(html.includes("data-label"), "cells need labels for the stacked layout");
});

test("the knocker rows are keyed to the timeline's areas", () => {
  assert.ok(html.includes("tally-key"), "the knocker rows need the area swatches");
  assert.ok(html.includes("BAND_VOLUNTEER"), "the volunteer swatch is missing");
  assert.ok(html.includes("BAND_CANDIDATE"), "the candidate swatch is missing");
});

test("the readout no longer reports goal pace in prose", () => {
  for (const gone of ["behind goal pace", "ahead of goal pace"]) {
    assert.ok(!html.includes(gone), `${gone} still ships`);
  }
});
