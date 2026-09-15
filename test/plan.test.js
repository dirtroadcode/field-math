import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, simulate, DEFAULTS } from "../src/plan.js";

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
const election = new Date(2026, 0, 31); // 30 days

// Total daily capacity far above the universe, so every door that can be
// knocked is knocked every day and the per-pass yield is isolated from labor.
const unlimited = { ...base, volunteers: 1000, hoursPerVolunteerPerWeek: 7, candidateHoursPerWeek: 100 };
// Long enough that repeat passes can confirm the whole universe.
const longElection = new Date(today.getTime() + 120 * 86400000);

test("the universe is the vote goal", () => {
  const p = plan({ ...base, today, election });
  assert.equal(p.voteGoal, 10000);
  assert.equal(p.universe, 10000);
  assert.equal(p.total.doors, 10000);
});

test("nobody leaves the universe until confirmed", () => {
  const p = simulate({ ...base, today, election });
  for (const d of p.days) {
    const accounted = d.remainingUncontacted + d.remainingHoldouts + d.cumConfirmations;
    assert.ok(Math.abs(accounted - 10000) < 1e-6);
  }
});

test("a day 0 baseline and one row per day through election day", () => {
  const p = simulate({ ...base, today, election });
  assert.equal(p.totalDays, 30);
  assert.equal(p.days.length, 31);
  assert.equal(p.days[0].day, 0);
  assert.equal(p.days[0].cumContacts, 0);
  assert.equal(p.days[0].cumConfirmations, 0);
  assert.equal(p.days[0].cumKnocks, 0);
});

test("conversations split by knocker, and the two add back to the total", () => {
  const p = simulate({ ...base, today, election });
  let prevVolunteer = 0;
  let prevCandidate = 0;
  for (const d of p.days) {
    assert.ok(Math.abs(d.cumVolunteerContacts + d.cumCandidateContacts - d.cumContacts) < 1e-6);
    assert.ok(d.cumVolunteerContacts >= prevVolunteer - 1e-9);
    assert.ok(d.cumCandidateContacts >= prevCandidate - 1e-9);
    prevVolunteer = d.cumVolunteerContacts;
    prevCandidate = d.cumCandidateContacts;
  }
});

test("every conversation confirms at the confirmation rate", () => {
  const p = simulate({ ...base, today, election });
  for (const d of p.days) {
    assert.ok(Math.abs(d.cumConfirmations - d.cumContacts * 0.6) < 1e-6);
    assert.ok(Math.abs(d.cumVolunteerConfirmations - d.cumVolunteerContacts * 0.6) < 1e-6);
    assert.ok(Math.abs(d.cumCandidateConfirmations - d.cumCandidateContacts * 0.6) < 1e-6);
  }
});

test("knocks, confirmations, and lit drops split by knocker and add back", () => {
  const p = simulate({ ...base, today, election });
  for (const d of p.days) {
    assert.ok(Math.abs(d.cumVolunteerKnocks + d.cumCandidateKnocks - d.cumKnocks) < 1e-6);
    assert.ok(Math.abs(d.cumVolunteerLitDrops + d.cumCandidateLitDrops - d.cumLitDrops) < 1e-6);
    assert.ok(Math.abs(d.cumKnocks - (d.cumContacts + d.cumLitDrops)) < 1e-6);
    assert.ok(d.cumVolunteerKnocks >= 0 && d.cumCandidateKnocks >= 0);
  }
});

test("uncontacted doors decay geometrically while capacity lasts", () => {
  const p = simulate({ ...unlimited, today, election });
  for (const d of p.days) {
    const remaining = 10000 * Math.pow(1 - 0.4, d.day);
    assert.ok(Math.abs(d.remainingUncontacted - remaining) < 1e-6);
  }
});

test("a holdout reached on a later pass is another conversation", () => {
  const p = simulate({ ...unlimited, today, election });
  // First contacts alone would be universe − still-uncontacted; once a holdout
  // is revisited the conversation total climbs past that.
  const d2 = p.days[2];
  assert.ok(d2.cumContacts > 10000 - d2.remainingUncontacted + 1e-6);
});

test("holdouts wait until the uncontacted pool is spent", () => {
  // Capacity too small ever to clear the uncontacted pool, so no day has
  // leftover for revisits and the holdout pool only grows.
  const p = simulate({ ...base, today, election, volunteers: 1, candidateHoursPerWeek: 1, hoursPerVolunteerPerWeek: 1 });
  assert.equal(p.outcome.uncontactedFinishDay, null);
  let prev = 0;
  for (const d of p.days) {
    assert.ok(d.remainingHoldouts >= prev - 1e-9);
    prev = d.remainingHoldouts;
  }
  assert.ok(p.days[p.days.length - 1].remainingHoldouts > 0);
});

test("an ample field reaches the universe through repeat passes", () => {
  const p = simulate({ ...unlimited, today, election: longElection });
  const last = p.days[p.days.length - 1];
  assert.equal(p.outcome.voteGoalMet, true);
  // One conversation per confirmation rate on average, so conversations climb
  // past the universe before the goal is confirmed.
  assert.ok(last.cumContacts > 10000);
  assert.ok(Math.round(last.cumConfirmations) >= 10000);
});

test("the field stops once confirmations cross the vote goal", () => {
  const p = simulate({ ...unlimited, today, election: longElection });
  const fd = p.outcome.goalMetDay;
  assert.ok(fd > 0 && fd <= p.totalDays);
  assert.ok(Math.round(p.days[fd].cumConfirmations) >= 10000);
  assert.ok(Math.round(p.days[fd - 1].cumConfirmations) < 10000);
  const last = p.days[p.days.length - 1];
  assert.ok(Math.abs(last.cumConfirmations - p.days[fd].cumConfirmations) < 1e-6);
  assert.ok(Math.abs(last.cumContacts - p.days[fd].cumContacts) < 1e-6);
});

test("an undersized field misses the goal and reports the gap", () => {
  const p = simulate({ ...base, today, election, volunteers: 1, candidateHoursPerWeek: 1, hoursPerVolunteerPerWeek: 1 });
  assert.equal(p.outcome.voteGoalMet, false);
  assert.equal(p.outcome.goalMetDay, null);
  assert.ok(p.outcome.gap > 0);
  assert.ok(p.outcome.projected < 10000);
});

test("unanswered knocks leave lit drops, tracked beside the conversations", () => {
  const p = simulate({ ...base, today, election });
  const last = p.days[p.days.length - 1];
  assert.ok(last.cumLitDrops > 0);
  // Every knock reaches at 0.4, so misses run 1.5 per conversation.
  assert.ok(Math.abs(last.cumLitDrops - last.cumContacts * 1.5) < 1e-6);
});

test("recruitment grows the volunteers toward steady state = recruits / attrition", () => {
  const year = new Date(2027, 0, 1);
  const p = simulate({ ...base, today, election: year, volunteers: 0, recruitPerWeek: 7, attritionPerWeek: 0.1 });
  assert.equal(p.outcome.equilibriumVolunteers, 70);
  assert.ok(p.outcome.finalVolunteers > 60);
  assert.ok(p.outcome.finalVolunteers < 70);
});

test("attrition shrinks the volunteer count with no recruitment", () => {
  const p = simulate({ ...base, today, election, volunteers: 20, recruitPerWeek: 0, attritionPerWeek: 0.2 });
  assert.ok(p.outcome.finalVolunteers < 20);
  assert.ok(p.outcome.finalVolunteers > 0);
});

test("retention is legible: losing nobody reaches the goal sooner", () => {
  const long = new Date(today.getTime() + 400 * 86400000);
  const p = simulate({
    ...base,
    today,
    election: long,
    volunteers: 20,
    recruitPerWeek: 2,
    attritionPerWeek: 0.15,
    candidateHoursPerWeek: 100,
  });
  assert.equal(p.outcome.goalMetDay !== null, true);
  assert.ok(p.outcome.goalMetDayNoAttrition < p.outcome.goalMetDay);
});

test("degenerate inputs fail loudly, not silently", () => {
  assert.throws(() => plan({ ...base, voteGoal: 0 }), /vote goal/);
  assert.throws(() => plan({ ...base, knockRate: 0 }), /knock rate/);
  assert.throws(() => plan({ ...base, hoursPerVolunteerPerWeek: -1 }), /hours per volunteer/);
  assert.throws(() => plan({ ...base, candidateHoursPerWeek: -1 }), /candidate hours/);
  assert.throws(() => plan({ ...base, recruitPerWeek: -1 }), /recruitment/);
  assert.throws(() => plan({ ...base, attritionPerWeek: 2 }), /attrition/);
  assert.throws(() => plan({ ...base, today, election: today }), /future/);
});

test("defaults are coherent for a fresh visitor", () => {
  assert.ok(DEFAULTS.voteGoal > 0);
  const p = simulate({ ...DEFAULTS, today, election });
  assert.ok(Number.isFinite(p.total.hours));
  assert.ok(p.days.length > 1);
  assert.ok(p.outcome.finalVolunteers >= 0);
});

test("fresh-visitor defaults describe a campaign starting from zero", () => {
  assert.equal(DEFAULTS.voteGoal, 1000);
  assert.equal(DEFAULTS.volunteers, 0);
  assert.equal(DEFAULTS.recruitPerWeek, 0);
  assert.equal(DEFAULTS.attritionPerWeek, 0.1);
  assert.equal(DEFAULTS.hoursPerVolunteerPerWeek, 4);
  assert.equal(DEFAULTS.candidateHoursPerWeek, 20);
  assert.equal(DEFAULTS.contactRate, 0.25);
});
