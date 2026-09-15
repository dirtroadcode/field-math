// Election Day defaults to the first Tuesday after the first Monday in
// November — the US general election date. All functions are pure: callers
// pass "today" explicitly so results are deterministic and testable.

export function firstTuesdayOf(year) {
  const nov1 = new Date(year, 10, 1);
  const dow = nov1.getDay(); // 0=Sun..6=Sat
  const daysToFirstMonday = dow === 1 ? 0 : (8 - dow) % 7;
  return new Date(year, 10, 1 + daysToFirstMonday + 1);
}

export function defaultElection(today) {
  let d = firstTuesdayOf(today.getFullYear());
  if (d <= today) d = firstTuesdayOf(today.getFullYear() + 1);
  return d;
}

export function formatDefaultElection(today) {
  const d = defaultElection(today);
  const pad = (n) => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}