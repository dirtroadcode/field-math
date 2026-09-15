import { test } from "node:test";
import assert from "node:assert/strict";
import {
  firstTuesdayOf,
  defaultElection,
  formatDefaultElection,
} from "../src/election.js";

// Known general-election dates: first Tuesday after the first Monday in November.
const KNOWN = [
  [2025, 11, 4],
  [2026, 11, 3],
  [2027, 11, 2],
  [2028, 11, 7],
  [2030, 11, 5],
];

test("first Tuesday after the first Monday in November, known years", () => {
  for (const [year, month, day] of KNOWN) {
    const d = firstTuesdayOf(year);
    assert.equal(d.getFullYear(), year);
    assert.equal(d.getMonth() + 1, month);
    assert.equal(d.getDate(), day);
    assert.equal(d.getDay(), 2, "must be a Tuesday");
  }
});

test("default election is the next upcoming one", () => {
  const today = new Date(2025, 8, 15); // Sep 15 2025
  const d = defaultElection(today);
  assert.ok(d > today, "must be in the future");
  assert.equal(d.getFullYear(), 2025);
  assert.equal(d.getMonth(), 10);

  const afterElection = new Date(2025, 10, 5); // Nov 5 2025
  assert.equal(defaultElection(afterElection).getFullYear(), 2026);
});

test("formatDefaultElection is yyyy-mm-dd", () => {
  assert.equal(formatDefaultElection(new Date(2025, 0, 1)), "2025-11-04");
  assert.equal(formatDefaultElection(new Date(2026, 0, 1)), "2026-11-03");
});