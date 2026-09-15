// The scrub tally is the model's per-knocker split dressed for the table: the
// knocker rows must add back to the total, and hours is the knock count at the
// knock rate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../src/plan.js";
import { tallyRows } from "../src/tally.js";
import { BAND_VOLUNTEER, BAND_CANDIDATE } from "../src/timeline-labels.js";

const base = {
  voteGoal: 10000,
  volunteers: 10,
  recruitPerWeek: 0,
  attritionPerWeek: 0,
  hoursPerVolunteerPerWeek: 2,
  candidateHoursPerWeek: 5,
  knockRate: 10,
  contactRate: 0.4,
  confirmationRate: 0.6,
};
const today = new Date(2026, 0, 1);
const election = new Date(2026, 0, 31);

function lastDay() {
  const p = simulate({ ...base, today, election });
  return { day: p.days[p.totalDays], knockRate: p.values.knockRate };
}

test("the knocker rows add back to the total", () => {
  const { day, knockRate } = lastDay();
  const { rows, total } = tallyRows(day, knockRate);
  for (const key of ["conversations", "confirmed", "litDrops", "hours"]) {
    const sum = rows.reduce((s, r) => s + r[key], 0);
    assert.ok(Math.abs(sum - total[key]) < 1e-6, `${key} does not add back to the total`);
  }
});

test("hours are knocks at the knock rate", () => {
  const { day, knockRate } = lastDay();
  const { rows, total } = tallyRows(day, knockRate);
  assert.ok(Math.abs(rows[0].hours - day.cumVolunteerKnocks / knockRate) < 1e-6);
  assert.ok(Math.abs(rows[1].hours - day.cumCandidateKnocks / knockRate) < 1e-6);
  assert.ok(Math.abs(total.hours - day.cumKnocks / knockRate) < 1e-6);
});

test("only the volunteer and total rows carry a headcount", () => {
  const { day, knockRate } = lastDay();
  const { rows, total } = tallyRows(day, knockRate);
  assert.equal(rows[0].volunteers, day.volunteers);
  assert.equal(rows[1].volunteers, null);
  assert.equal(total.volunteers, day.volunteers);
});

test("the knocker rows wear the timeline's own area swatches", () => {
  const { day, knockRate } = lastDay();
  const { rows, total } = tallyRows(day, knockRate);
  assert.equal(rows[0].band, BAND_VOLUNTEER);
  assert.equal(rows[1].band, BAND_CANDIDATE);
  assert.equal(total.band, null);
});
