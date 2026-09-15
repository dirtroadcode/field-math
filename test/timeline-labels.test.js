// The timeline's right-hand rail stacks one label per line and area. The label
// geometry is a pure function of the plan, so it is tested here rather than
// through the DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../src/plan.js";
import { railLabels } from "../src/timeline-labels.js";

const today = new Date(2026, 0, 1);
const election = new Date(2026, 10, 3);

// A linear height map, so a label's anchor reads directly as the value it
// points at.
function makeY(yMax, yBot, plotH) {
  return function (v) { return yBot - (v / yMax) * plotH; };
}

function scenario() {
  // A campaign with enough volunteer labor to confirm the goal before Election
  // Day, so conversations run past it and the axis top clears the goal line.
  const p = simulate({
    today,
    election,
    volunteers: 40,
    hoursPerVolunteerPerWeek: 4,
    candidateHoursPerWeek: 20,
  });
  const last = p.days[p.days.length - 1];
  const yMax = Math.max(p.voteGoal, last.cumContacts, last.cumConfirmations);
  const yBot = 260, plotH = 200;
  return { p, yMax, yBot, Y: makeY(yMax, yBot, plotH) };
}

test("the vote-goal label follows the pace line's endpoint, not the axis top", () => {
  const { p, yMax, yBot, Y } = scenario();
  const last = p.days[p.days.length - 1];
  assert.ok(last.cumContacts > p.voteGoal, "this scenario must have conversations past the goal");
  const goal = railLabels(p, Y, yBot).find(function (l) { return l.text === "VOTE GOAL"; });
  assert.ok(goal, "the vote-goal label is missing");
  assert.equal(goal.line, Y(p.voteGoal));
  assert.ok(goal.line > Y(yMax), "the label must sit below the axis top when conversations exceed the goal");
});

test("the rail names the goal and confirmed votes plainly", () => {
  const { p, yBot, Y } = scenario();
  const texts = railLabels(p, Y, yBot).map(function (l) { return l.text; });
  assert.ok(texts.includes("VOTE GOAL"), "the goal label is not named");
  assert.ok(texts.includes("CONFIRMED VOTES"), "the confirmed label is not named");
  assert.ok(!texts.includes("ON PACE"), "the old goal label still ships");
  assert.ok(!texts.includes("CONFIRMED"), "the bare confirmed label still ships");
});
