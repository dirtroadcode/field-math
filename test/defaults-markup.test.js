// The template declares the same defaults as the model so the page is correct
// before app.js runs, and stays correct if the script never does. Two copies of
// the numbers can drift, so pin the markup to DEFAULTS here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULTS } from "../src/plan.js";

const html = readFileSync(new URL("../src/template.html", import.meta.url), "utf8");

// [input id, value the markup must declare]. Percent sliders carry whole
// percents; plan.js keeps the same rates as fractions.
const expected = {
  "f-target": DEFAULTS.voteGoal,
  "s-volunteers": DEFAULTS.volunteers,
  "s-recruit": DEFAULTS.recruitPerWeek,
  "s-attrition": DEFAULTS.attritionPerWeek * 100,
  "s-volhours": DEFAULTS.hoursPerVolunteerPerWeek,
  "s-candhours": DEFAULTS.candidateHoursPerWeek,
  "s-pace": DEFAULTS.knockRate,
  "s-contact": DEFAULTS.contactRate * 100,
  "s-confirm": DEFAULTS.confirmationRate * 100,
};

function inputTag(id) {
  const tags = [...html.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
  const tag = tags.find((t) => t.includes(`id="${id}"`));
  assert.ok(tag, `no input with id ${id}`);
  return tag;
}

test("every control's markup default matches DEFAULTS", () => {
  for (const [id, value] of Object.entries(expected)) {
    const declared = inputTag(id).match(/value="([^"]*)"/);
    assert.ok(declared, `${id} declares no value`);
    assert.equal(declared[1], String(Math.round(value)), `${id} markup default drifts from DEFAULTS`);
  }
});
