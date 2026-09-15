// The timeline's right-hand rail: one label per line and area, each anchored to
// the height it finishes at and stacked so they never collide. Pure geometry so
// the positioning can be tested without a DOM.

// Band fills read over the panel, so they must stay legible as colours rather
// than dissolving into the near-white background. The volunteer fill is navy's
// hue carried at a lighter, more chromatic stop; a plain navy tint goes grey.
export var BAND_VOLUNTEER = "rgba(31,95,143,.32)";
export var BAND_CANDIDATE = "rgba(254,221,0,.28)";

var MIN_GAP = 15;

export function railLabels(p, Y, yBot) {
  var last = p.days[p.days.length - 1];
  var volTop = Y(last.cumVolunteerContacts);
  var convTop = Y(last.cumContacts);
  var labels = [
    { text: "CONVERSATIONS", color: "#001f33", line: convTop },
    { text: "CONFIRMED VOTES", color: "#8a7500", line: Y(last.cumConfirmations) },
    // The pace line ends at the vote goal, not at the top of the axis: when
    // conversations outgrow the goal the axis top rises, the goal does not.
    { text: "VOTE GOAL", color: "#4a5464", line: Y(p.voteGoal) },
    // The filled areas get a swatch so they read as areas, not lines.
    { text: "VOLUNTEER", color: "#4a5464", line: (volTop + yBot) / 2, swatch: BAND_VOLUNTEER },
    { text: "CANDIDATE", color: "#4a5464", line: (convTop + volTop) / 2, swatch: BAND_CANDIDATE },
  ].sort(function (a, b) { return a.line - b.line; });

  labels.forEach(function (l, i) {
    l.at = i === 0 ? l.line : Math.max(l.line, labels[i - 1].at + MIN_GAP);
  });
  var overflow = labels[labels.length - 1].at - yBot;
  if (overflow > 0) labels.forEach(function (l) { l.at -= overflow; });
  return labels;
}
