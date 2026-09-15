import { test } from "node:test";
import assert from "node:assert/strict";
import { explain } from "../src/model-copy.js";

function allText(ex) {
  return [ex.lede, ...ex.sections.flatMap((s) => [s.title, ...s.blocks.map((b) => b.text)])].join("\n");
}

function formulas(ex, id) {
  return ex.sections.find((s) => s.id === id).blocks
    .filter((b) => b.type === "formula")
    .map((b) => b.text)
    .join("\n");
}

test("the universe section sizes the universe from the vote goal", () => {
  const text = formulas(explain(), "universe");
  assert.ok(text.includes("universe = vote goal"));
});

test("the caps section gives the daily doors-per-day formula", () => {
  const text = formulas(explain(), "caps");
  assert.ok(text.includes("volunteer doors/day = volunteers × hours per volunteer per week × knock rate ÷ 7"));
  assert.ok(text.includes("candidate doors/day = candidate hours per week × knock rate ÷ 7"));
});

test("the accrual section gives the contact, confirmation, and compounding formulas", () => {
  const text = formulas(explain(), "accrual");
  assert.ok(text.includes("conversations = knocks × contact rate"));
  assert.ok(text.includes("confirmations = conversations × confirmation rate"));
  assert.ok(text.includes("over k passes: 1 − (1 − contact rate × confirmation rate)^k"));
});

test("the turnover section gives the daily rule and the steady state", () => {
  const text = formulas(explain(), "turnover");
  assert.ok(text.includes("volunteers += recruits ÷ 7 − volunteers × attrition ÷ 7"));
  assert.ok(text.includes("dV/dt = recruits − attrition × V"));
  assert.ok(text.includes("steady state = recruitment ÷ attrition"));
});

test("the pace section gives the vote-goal pace line", () => {
  const text = formulas(explain(), "pace");
  assert.ok(text.includes("pace line = vote goal × elapsed days ÷ total campaign days"));
});

test("the view shows formulas, not worked numbers", () => {
  for (const s of explain().sections) {
    for (const b of s.blocks) {
      if (b.type !== "formula") continue;
      assert.doesNotMatch(b.text, /\d{1,3}(,\d{3})/, `${s.id} substitutes a count: ${b.text}`);
    }
  }
});

test("the copy follows house style", () => {
  const ex = explain();
  const text = allText(ex);
  assert.doesNotMatch(ex.lede, /—/);
  assert.doesNotMatch(text, /\bcrew\b/i);
  assert.doesNotMatch(text, /\broad\b/i);
  assert.doesNotMatch(text, /Election Day/);
  assert.match(text, /election day/);
  assert.match(text, /volunteers/);
  assert.match(text, /timeline/);
  assert.match(text, /\byou\b|\byour\b/i);
});

test("the view walks the model in computation order", () => {
  const ex = explain();
  assert.deepEqual(
    ex.sections.map((s) => s.id),
    ["universe", "caps", "accrual", "turnover", "pace", "verdict"]
  );
  for (const s of ex.sections) {
    assert.ok(s.title.length > 0);
    assert.ok(s.blocks.length > 0);
    for (const b of s.blocks) assert.match(b.type, /^(p|formula)$/);
  }
});
