/* The DOM layer: read the controls, run the model, and draw the timeline and the
   model view. Everything it touches lives under #drc so the artifact drops into
   a host page without reaching outside. */
import { railLabels, BAND_VOLUNTEER, BAND_CANDIDATE } from "./timeline-labels.js";
import { tallyRows } from "./tally.js";
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var DAY = 86400000;
  // Below this width the chart is too small for the rail labels; the legend
  // below carries the key there instead. Mirrors the CSS media query.
  var COMPACT = window.matchMedia("(max-width: 880px)");

  // [inputId, readoutFormatter]; the output is "#v-" + id without its prefix.
  var SLIDERS = [
    ["s-volunteers", function (v) { return fmt(v) + "<small> now</small>"; }],
    ["s-recruit", function (v) { return fmt(v) + "<small> / week</small>"; }],
    ["s-attrition", function (v) { return v + "%<small> / week</small>"; }],
    ["s-volhours", function (v) { return fmt(v) + "<small> / week</small>"; }],
    ["s-candhours", function (v) { return fmt(v) + "<small> / week</small>"; }],
    ["s-pace", function (v) { return fmt(v) + "<small> doors / hr</small>"; }],
    ["s-contact", function (v) { return v + "%"; }],
    ["s-confirm", function (v) { return v + "%"; }],
  ];

  var scrubDay = 0;
  var firstRender = true;
  var last = null;

  function num(el) {
    var v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  }
  function fmt(n) {
    if (!isFinite(n)) return "∞";
    return Math.round(n).toLocaleString("en-US");
  }
  function fmtDate(d) {
    if (!d) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function parseDate(value) {
    return new Date(value + "T00:00:00");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function read() {
    return {
      voteGoal: num($("f-target")),
      volunteers: num($("s-volunteers")),
      recruitPerWeek: num($("s-recruit")),
      attritionPerWeek: num($("s-attrition")) / 100,
      hoursPerVolunteerPerWeek: num($("s-volhours")),
      candidateHoursPerWeek: num($("s-candhours")),
      knockRate: num($("s-pace")),
      contactRate: num($("s-contact")) / 100,
      confirmationRate: num($("s-confirm")) / 100,
      election: $("f-date").value ? parseDate($("f-date").value) : undefined,
    };
  }

  function render() {
    SLIDERS.forEach(function (s) {
      var out = $("v-" + s[0].slice(2));
      if (out) out.innerHTML = s[1](num($(s[0])));
    });
    var target = num($("f-target"));

    if (!(target > 0)) {
      setBlank("Enter a vote goal to draw the timeline.");
      return;
    }

    var d = read();
    var p;
    try {
      p = simulate(d);
    } catch (err) {
      setBlank(err.message.charAt(0).toUpperCase() + err.message.slice(1) + ".");
      return;
    }
    last = { p: p };

    if (firstRender) {
      scrubDay = p.outcome.goalMetDay != null ? p.outcome.goalMetDay : p.totalDays;
      firstRender = false;
    }
    scrubDay = Math.max(0, Math.min(p.totalDays, scrubDay));
    var scrub = $("s-scrub");
    scrub.max = String(p.totalDays);
    scrub.value = String(scrubDay);

    drawTimeline(p);
    renderScrubReadout(p);
  }

  function onScrub() {
    if (!last) return;
    scrubDay = Math.max(0, Math.min(last.p.totalDays, num($("s-scrub"))));
    drawTimeline(last.p);
    renderScrubReadout(last.p);
  }

  // The timeline: conversations and confirmed votes against the straight
  // vote-goal pace line. Conversations can climb past the goal when capacity
  // outlasts the initial universe, so the scale follows the taller series. The
  // scrubber is an invisible range laid over the plot so the whole chart is
  // draggable.
  function drawTimeline(p) {
    var W = 820, H = 300, padL = 58, padT = 26, padB = 40;
    var padR = COMPACT.matches ? 14 : 168;
    var x0 = padL, x1 = W - padR, yTop = padT, yBot = H - padB;
    var plotW = x1 - x0, plotH = yBot - yTop;
    var totalDays = p.totalDays;
    var last = p.days[p.days.length - 1];
    var yMax = Math.max(p.voteGoal, last.cumContacts, last.cumConfirmations, 1);
    var X = function (day) { return x0 + (day / totalDays) * plotW; };
    var Y = function (v) { return yBot - (Math.max(0, Math.min(v, yMax)) / yMax) * plotH; };
    var parts = [];

    var scrub = $("s-scrub");
    scrub.style.left = (x0 / W) * 100 + "%";
    scrub.style.right = (padR / W) * 100 + "%";

    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var y = Y(yMax * f);
      parts.push('<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#e7eef4" stroke-width="1"/>');
      parts.push('<text x="' + (x0 - 8) + '" y="' + (y + 4) + '" text-anchor="end" fill="#4a5464" font-size="11">' + fmt(yMax * f) + "</text>");
    });
    parts.push('<text x="' + (x0 - 8) + '" y="' + (yTop - 10) + '" text-anchor="end" fill="#4a5464" font-size="10" letter-spacing="1">PEOPLE</text>');

    parts.push('<line x1="' + x1 + '" y1="' + yTop + '" x2="' + x1 + '" y2="' + yBot + '" stroke="#001f33" stroke-width="1.5"/>');

    // Conversations are two stacked areas by knocker: the volunteers' band
    // under the candidate's. The shared pool is worked uncontacted-first, so
    // the volunteer band keeps climbing as holdouts are revisited.
    var volPts = p.days.map(function (day) { return X(day.day) + "," + Y(day.cumVolunteerContacts); });
    var convPts = p.days.map(function (day) { return X(day.day) + "," + Y(day.cumContacts); });
    parts.push('<polygon points="' + X(0) + "," + yBot + " " + volPts.join(" ") + " " + X(totalDays) + "," + yBot + '" fill="' + BAND_VOLUNTEER + '"/>');
    parts.push('<polygon points="' + volPts.join(" ") + " " + convPts.slice().reverse().join(" ") + '" fill="' + BAND_CANDIDATE + '"/>');
    parts.push('<polyline points="' + volPts.join(" ") + '" fill="none" stroke="#001f33" stroke-width="1" opacity="0.35"/>');
    parts.push('<polyline points="' + convPts.join(" ") + '" fill="none" stroke="#001f33" stroke-width="2.5" stroke-linejoin="round"/>');

    // Reference lines ride above the washes so they stay crisp where they cross.
    if (p.schedule.gotvStart > p.today) {
      var gd = (p.schedule.gotvStart - p.today) / DAY;
      if (gd > 0 && gd <= totalDays) {
        var gx = X(gd);
        parts.push('<line x1="' + gx + '" y1="' + yTop + '" x2="' + gx + '" y2="' + yBot + '" stroke="#8a7500" stroke-width="1" stroke-dasharray="2 4" opacity="0.5"/>');
        parts.push('<text x="' + gx + '" y="' + (yTop - 10) + '" text-anchor="middle" fill="#8a7500" font-size="10" letter-spacing="1">GOTV</text>');
      }
    }
    parts.push('<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(totalDays) + '" y2="' + Y(p.voteGoal) + '" stroke="#4a5464" stroke-width="2" stroke-dasharray="7 6"/>');

    var pts = p.days.map(function (day) { return X(day.day) + "," + Y(day.cumConfirmations); });
    parts.push('<polyline points="' + pts.join(" ") + '" fill="none" stroke="#8a7500" stroke-width="2.5" stroke-linejoin="round"/>');

    var sd = p.days[scrubDay];
    var sx = X(sd.day), sy = Y(sd.cumConfirmations);
    parts.push('<line x1="' + sx + '" y1="' + yTop + '" x2="' + sx + '" y2="' + yBot + '" stroke="#001726" stroke-width="1" opacity="0.45"/>');
    parts.push('<circle cx="' + sx + '" cy="' + sy + '" r="5.5" fill="#fedd00" stroke="#001726" stroke-width="2"/>');
    var anchor = "middle", tx = sx, ty = sy - 11;
    if (sx > x1 - 48) { anchor = "end"; tx = sx - 7; }
    else if (sx < x0 + 48) { anchor = "start"; tx = sx + 7; }
    if (ty < yTop + 8) ty = sy + 19;
    parts.push('<text x="' + tx + '" y="' + ty + '" text-anchor="' + anchor + '" fill="#001726" font-size="11" font-weight="600" stroke="#f3f7fa" stroke-width="3" paint-order="stroke">' + fmt(sd.cumConfirmations) + "</text>");

    parts.push('<text x="' + x0 + '" y="' + (yBot + 22) + '" text-anchor="start" fill="#4a5464" font-size="11">' + fmtDate(p.today) + "</text>");
    parts.push('<text x="' + x1 + '" y="' + (yBot + 22) + '" text-anchor="end" fill="#001f33" font-size="11" font-weight="600">' + fmtDate(p.election) + "</text>");

    // One label per line and area sits in a right-hand rail, each tied back to
    // the height it finishes at by a leader.
    if (!COMPACT.matches) {
      var railX = x1 + 20;
      railLabels(p, Y, yBot).forEach(function (l) {
        parts.push('<line x1="' + x1 + '" y1="' + l.line + '" x2="' + (railX - 6) + '" y2="' + l.at + '" stroke="' + l.color + '" stroke-width="1" opacity="0.5"/>');
        if (l.swatch) {
          parts.push('<rect x="' + railX + '" y="' + (l.at - 4.5) + '" width="13" height="9" fill="' + l.swatch + '" stroke="#c9d7e2" stroke-width="1"/>');
        }
        parts.push('<text x="' + (railX + (l.swatch ? 18 : 0)) + '" y="' + (l.at + 3.5) + '" fill="' + l.color + '" font-size="10" font-weight="600" letter-spacing="0.05em">' + l.text + "</text>");
      });
    }
    $("timeline-chart").innerHTML = parts.join("");
  }

  // The day's tally: a table, split by knocker, closed by a total row.
  function renderScrubReadout(p) {
    var day = p.days[scrubDay];
    var tally = tallyRows(day, p.values.knockRate);
    var row = function (r) {
      var cell = function (label, value) {
        return '<td data-label="' + esc(label) + '">' + value + "</td>";
      };
      return "<tr>" +
        '<th scope="row">' +
          (r.band ? '<i class="tally-key" style="background:' + r.band + '"></i>' : "") +
          esc(r.label) +
        "</th>" +
        cell("Conversations", fmt(r.conversations)) +
        cell("Confirmed", fmt(r.confirmed)) +
        cell("Lit drops", fmt(r.litDrops)) +
        cell("Hours", fmt(r.hours)) +
        (r.volunteers == null
          ? '<td data-label="Volunteers" class="tally-none">—</td>'
          : cell("Volunteers", fmt(r.volunteers))) +
        "</tr>";
    };
    $("o-scrub-readout").innerHTML =
      '<table class="tally">' +
        "<caption><b>" + fmtDate(day.date) + "</b> · Day " + day.day + " of " + p.totalDays + "</caption>" +
        "<thead><tr>" +
          '<th scope="col"><span class="sr-only">Knocker</span></th>' +
          '<th scope="col">Conversations</th>' +
          '<th scope="col">Confirmed</th>' +
          '<th scope="col">Lit drops</th>' +
          '<th scope="col">Hours</th>' +
          '<th scope="col">Volunteers</th>' +
        "</tr></thead>" +
        "<tbody>" + tally.rows.map(row).join("") + "</tbody>" +
        "<tfoot>" + row(tally.total) + "</tfoot>" +
      "</table>";
  }

  // The "How the model works" view: static reference copy, rendered once.
  function renderModel() {
    var ex = explain();
    var html = '<p class="model-lede">' + esc(ex.lede) + "</p>";
    ex.sections.forEach(function (s, i) {
      var blocks = "";
      s.blocks.forEach(function (b) {
        blocks += b.type === "formula"
          ? '<div class="model-plate"><p class="model-eq">' + esc(b.text) + "</p></div>"
          : "<p>" + esc(b.text) + "</p>";
      });
      html += '<section class="model-step">' +
        '<span class="model-num">' + String(i + 1).padStart(2, "0") + "</span>" +
        "<h2>" + esc(s.title) + "</h2>" +
        '<div class="model-body">' + blocks + "</div>" +
        "</section>";
    });
    $("o-model").innerHTML = html;
  }

  // Swap between the calculator and the model view, moving focus so keyboard
  // and screen-reader users land in the view that just opened.
  function showView(which) {
    var open = which === "model";
    $("drc-calc").hidden = open;
    $("drc-model").hidden = !open;
    if (open) $("model-title").focus();
    else $("open-model").focus();
  }

  function setBlank(message) {
    last = null;
    $("o-scrub-readout").textContent = message || "";
    $("timeline-chart").innerHTML = "";
  }

  function init() {
    $("f-target").value = DEFAULTS.voteGoal;
    $("f-date").value = formatDefaultElection(new Date());
    $("s-volunteers").value = DEFAULTS.volunteers;
    $("s-recruit").value = DEFAULTS.recruitPerWeek;
    $("s-attrition").value = DEFAULTS.attritionPerWeek * 100;
    $("s-volhours").value = DEFAULTS.hoursPerVolunteerPerWeek;
    $("s-candhours").value = DEFAULTS.candidateHoursPerWeek;
    $("s-pace").value = DEFAULTS.knockRate;
    $("s-contact").value = DEFAULTS.contactRate * 100;
    $("s-confirm").value = DEFAULTS.confirmationRate * 100;

    SLIDERS.forEach(function (s) { $(s[0]).addEventListener("input", render); });
    $("f-target").addEventListener("input", render);
    $("f-date").addEventListener("input", render);
    $("s-scrub").addEventListener("input", onScrub);
    COMPACT.addEventListener("change", render);
    $("open-model").addEventListener("click", function () { showView("model"); });
    $("close-model").addEventListener("click", function () { showView("calc"); });
    $("drc-model").addEventListener("keydown", function (e) {
      if (e.key === "Escape") showView("calc");
    });
    renderModel();
    render();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
