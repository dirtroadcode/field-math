// The field plan model. plan() sizes the universe at rest; simulate() runs it
// day by day so volunteer growth and attrition bend the timeline.
//
// There is one universe, sized from the vote goal. Volunteers and the candidate
// knock the same pool: every person moves uncontacted → contacted-unconfirmed
// (a holdout) → confirmed. Each day the field's capacity goes to uncontacted
// doors first; only leftover capacity revisits holdouts, so holdouts wait until
// the uncontacted pool is spent. A knock reaches at the contact rate and every
// reach is a conversation — first contact or revisit alike — so the
// conversation count keeps climbing as holdouts are reworked. Nobody leaves the
// universe until they confirm.
import { defaultElection } from "./election.js";

export const DEFAULTS = {
  voteGoal: 1000,
  volunteers: 0,
  recruitPerWeek: 0,
  attritionPerWeek: 0.1,
  hoursPerVolunteerPerWeek: 4,
  candidateHoursPerWeek: 20,
  knockRate: 10,
  contactRate: 0.25,
  confirmationRate: 0.6,
};

const DAY = 86400000;
const GOTV_WINDOW_DAYS = 28;
// People are whole, so a pool with less than one person left is exhausted.
const ONE_PERSON = 1;

function fail(condition, message) {
  if (!condition) throw new Error(message);
}

function normalize(input) {
  const i = { ...DEFAULTS, ...(input ?? {}) };
  fail(i.voteGoal > 0, "vote goal must be positive");
  fail(i.knockRate > 0, "knock rate must be positive");
  fail(i.hoursPerVolunteerPerWeek >= 0, "hours per volunteer per week cannot be negative");
  fail(i.candidateHoursPerWeek >= 0, "candidate hours per week cannot be negative");
  fail(i.volunteers >= 0, "volunteers cannot be negative");
  fail(i.recruitPerWeek >= 0, "recruitment cannot be negative");
  fail(i.attritionPerWeek >= 0 && i.attritionPerWeek <= 1, "attrition must be between 0 and 1");
  fail(i.contactRate >= 0 && i.contactRate <= 1, "contact rate must be between 0 and 1");
  fail(i.confirmationRate >= 0 && i.confirmationRate <= 1, "confirmation rate must be between 0 and 1");

  const today = i.today ?? new Date();
  const election = i.election ?? defaultElection(today);
  fail(election > today, "election day must be in the future");
  return { i, today, election };
}

function sizing(i) {
  const universe = i.voteGoal;
  return {
    universe,
    hours: universe / i.knockRate,
  };
}

function aggregates(i, today, election) {
  const { universe, hours } = sizing(i);
  const daysRemaining = Math.round((election - today) / DAY);
  const weeksRemaining = Math.max(0, Math.floor(daysRemaining / 7));
  const gotvStart = new Date(election.getTime() - GOTV_WINDOW_DAYS * DAY);

  return {
    universe,
    total: { doors: universe, hours },
    schedule: { daysRemaining, weeksRemaining, gotvStart, inGotvWindow: gotvStart <= today },
    voteGoal: universe,
    values: i,
    today,
    election,
  };
}

export function plan(input) {
  const { i, today, election } = normalize(input);
  return aggregates(i, today, election);
}

// One day of the field's shared capacity against the universe. A door is
// knocked at most once a day, so the two knockers split the pool rather than
// each re-knocking the other's unanswered doors: capacity always goes to
// uncontacted doors first, and only leftover revisits holdouts — those already
// contacted but not confirmed. Every reach is a conversation; a conversation
// confirms at the confirmation rate, and the rest stay holdouts for a later
// pass. Missed knocks leave a lit drop.
function workDay(pool, volunteerCapacity, candidateCapacity, contactRate, confirmationRate) {
  const capacity = volunteerCapacity + candidateCapacity;
  const priorHoldouts = pool.holdouts;

  const freshKnocks = Math.min(pool.uncontacted, capacity);
  const volunteerFresh = Math.min(volunteerCapacity, freshKnocks);
  const candidateFresh = freshKnocks - volunteerFresh;

  const revisitKnocks = Math.min(priorHoldouts, capacity - freshKnocks);
  const volunteerRevisit = Math.min(volunteerCapacity - volunteerFresh, revisitKnocks);
  const candidateRevisit = revisitKnocks - volunteerRevisit;

  const freshReach = freshKnocks * contactRate;
  const revisitReach = revisitKnocks * contactRate;
  const contacts = freshReach + revisitReach;
  const confirmations = contacts * confirmationRate;

  pool.uncontacted -= freshReach;
  pool.holdouts += freshReach - freshReach * confirmationRate - revisitReach * confirmationRate;

  const volunteerKnocks = volunteerFresh + volunteerRevisit;
  const candidateKnocks = candidateFresh + candidateRevisit;
  return {
    knocks: freshKnocks + revisitKnocks,
    volunteerKnocks,
    candidateKnocks,
    contacts,
    volunteerContacts: volunteerKnocks * contactRate,
    candidateContacts: candidateKnocks * contactRate,
    confirmations,
    lit: freshKnocks + revisitKnocks - contacts,
  };
}

// The day loop. Day 0 is today: the starting state, no work done. Each later
// day knocks what the volunteers and the candidate can, then recruits and
// losses land.
function runDays(i, today, election, attritionPerWeek) {
  const { universe } = sizing(i);
  const totalDays = Math.max(1, Math.round((election - today) / DAY));
  const volunteerDoorsPerDay = (i.hoursPerVolunteerPerWeek * i.knockRate) / 7;
  const candidateDoorsPerDay = (i.candidateHoursPerWeek * i.knockRate) / 7;
  const recruitPerDay = i.recruitPerWeek / 7;
  const attritionPerDay = attritionPerWeek / 7;

  const pool = { uncontacted: universe, holdouts: 0 };

  const days = [];
  let volunteers = i.volunteers;
  let cumContacts = 0;
  let cumVolunteerContacts = 0;
  let cumCandidateContacts = 0;
  let cumConfirmations = 0;
  let cumVolunteerConfirmations = 0;
  let cumCandidateConfirmations = 0;
  let cumLitDrops = 0;
  let cumVolunteerLitDrops = 0;
  let cumCandidateLitDrops = 0;
  let cumKnocks = 0;
  let cumVolunteerKnocks = 0;
  let cumCandidateKnocks = 0;
  let uncontactedFinishDay = null;
  let goalMetDay = null;

  for (let d = 0; d <= totalDays; d++) {
    let knocked = 0;
    let contactsToday = 0;
    let volunteerContactsToday = 0;
    let candidateContactsToday = 0;
    let confirmedToday = 0;
    let litToday = 0;

    if (d > 0) {
      // The field knocks until confirmations cross the vote goal; after that it
      // has done its job and the curves flatten. People are whole, so a
      // sub-person residue in the confirmation count counts as arrived.
      const goalMet = Math.round(cumConfirmations) >= universe;
      if (!goalMet) {
        const w = workDay(pool, volunteers * volunteerDoorsPerDay, candidateDoorsPerDay, i.contactRate, i.confirmationRate);
        knocked = w.knocks;
        contactsToday = w.contacts;
        volunteerContactsToday = w.volunteerContacts;
        candidateContactsToday = w.candidateContacts;
        confirmedToday = w.confirmations;
        litToday = w.lit;
        cumContacts += contactsToday;
        cumVolunteerContacts += volunteerContactsToday;
        cumCandidateContacts += candidateContactsToday;
        cumConfirmations += confirmedToday;
        cumVolunteerConfirmations += w.volunteerContacts * i.confirmationRate;
        cumCandidateConfirmations += w.candidateContacts * i.confirmationRate;
        cumLitDrops += litToday;
        cumVolunteerLitDrops += w.volunteerKnocks - w.volunteerContacts;
        cumCandidateLitDrops += w.candidateKnocks - w.candidateContacts;
        cumKnocks += w.knocks;
        cumVolunteerKnocks += w.volunteerKnocks;
        cumCandidateKnocks += w.candidateKnocks;
      }

      if (uncontactedFinishDay === null && pool.uncontacted < ONE_PERSON) uncontactedFinishDay = d;
      if (goalMetDay === null && Math.round(cumConfirmations) >= universe) goalMetDay = d;

      volunteers = Math.max(0, volunteers + recruitPerDay - volunteers * attritionPerDay);
    }

    days.push({
      day: d,
      date: new Date(today.getTime() + d * DAY),
      volunteers,
      knocked,
      contactsToday,
      volunteerContactsToday,
      candidateContactsToday,
      confirmedToday,
      litToday,
      cumContacts,
      cumVolunteerContacts,
      cumCandidateContacts,
      cumConfirmations,
      cumVolunteerConfirmations,
      cumCandidateConfirmations,
      cumLitDrops,
      cumVolunteerLitDrops,
      cumCandidateLitDrops,
      cumKnocks,
      cumVolunteerKnocks,
      cumCandidateKnocks,
      remainingUncontacted: pool.uncontacted,
      remainingHoldouts: pool.holdouts,
    });
  }

  return { days, uncontactedFinishDay, goalMetDay, totalDays, volunteerDoorsPerDay, candidateDoorsPerDay };
}

export function simulate(input) {
  const { i, today, election } = normalize(input);
  const agg = aggregates(i, today, election);
  const run = runDays(i, today, election, i.attritionPerWeek);
  const kept = i.attritionPerWeek > 0 ? runDays(i, today, election, 0) : run;

  const final = run.days[run.days.length - 1];
  const projected = final.cumConfirmations;
  const conversations = final.cumContacts;
  const weeks = run.totalDays / 7;
  const doorsPerVolunteer = i.hoursPerVolunteerPerWeek * i.knockRate * weeks;
  const peakVolunteers = run.days.reduce((m, d) => Math.max(m, d.volunteers), 0);

  const outcome = {
    conversations,
    conversationShare: conversations / agg.voteGoal,
    voteGoalMet: run.goalMetDay !== null,
    goalMetDay: run.goalMetDay,
    goalMetDate: run.goalMetDay === null ? null : run.days[run.goalMetDay].date,
    uncontactedFinishDay: run.uncontactedFinishDay,
    projected,
    confirmedShare: projected / agg.voteGoal,
    gap: Math.max(0, agg.voteGoal - projected),
    goalMetDayNoAttrition: kept.goalMetDay,
    startVolunteers: i.volunteers,
    finalVolunteers: final.volunteers,
    peakVolunteers,
    volunteersNeeded: doorsPerVolunteer > 0 ? Math.ceil(agg.voteGoal / doorsPerVolunteer) : Infinity,
    equilibriumVolunteers: i.attritionPerWeek > 0 ? i.recruitPerWeek / i.attritionPerWeek : Infinity,
  };

  return {
    ...agg,
    days: run.days,
    totalDays: run.totalDays,
    capacity: {
      volunteerDoorsPerDay: run.volunteerDoorsPerDay,
      candidateDoorsPerDay: run.candidateDoorsPerDay,
    },
    outcome,
  };
}
