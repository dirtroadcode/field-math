// The timeline section is a console: the inputs sit directly above the graph
// they move, so the reader watches the line bend under their own hand. Nothing
// that restates what the graph already shows belongs above it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../build.mjs";

const html = build();

function timelineSection() {
  const from = html.indexOf('class="timeline-sec"');
  assert.notEqual(from, -1, "the timeline section is missing");
  const to = html.indexOf("</section>", from);
  assert.notEqual(to, -1, "the timeline section never closes");
  return html.slice(from, to);
}

test("no verdict chrome survives anywhere in the artifact", () => {
  for (const gone of ["o-status", "o-verdict", "verdict-line", "verdict-copy", 'class="pill"']) {
    assert.ok(!html.includes(gone), `${gone} still ships`);
  }
});

test("the controls run into the graph they move", () => {
  const section = timelineSection();
  const controls = section.indexOf('class="controls"');
  const chart = section.indexOf('id="timeline-chart"');
  assert.notEqual(controls, -1, "the controls are not in the timeline section");
  assert.notEqual(chart, -1, "the graph is not in the timeline section");
  assert.ok(controls < chart, "the graph must draw below the controls that move it");
});

test("the timeline key splits conversations into volunteer and candidate areas", () => {
  const section = timelineSection();
  const from = section.indexOf('class="legend"');
  assert.notEqual(from, -1, "the timeline key is missing");
  const legend = section.slice(from, section.indexOf("</div>", from));
  assert.ok(legend.includes("Volunteer"), "the volunteer area is not keyed");
  assert.ok(legend.includes("Candidate"), "the candidate area is not keyed");
  assert.equal((legend.match(/class="key-area/g) || []).length, 2, "each filled area needs a swatch");
});

test("the chart describes both conversation areas for screen readers", () => {
  const section = timelineSection();
  const svg = section.slice(section.indexOf("<svg"), section.indexOf("</svg>"));
  assert.ok(/volunteer/i.test(svg), "the chart label omits the volunteer area");
  assert.ok(/candidate/i.test(svg), "the chart label omits the candidate area");
});

test("the persuasion share control is gone", () => {
  for (const gone of ["Persuasion share", "s-share", "v-share", "splitbar", "split-key", "o-bar-base", "o-bar-pers"]) {
    assert.ok(!html.includes(gone), `${gone} still ships`);
  }
});

test("the election day picker opens the hero", () => {
  const heroStart = html.indexOf('<header class="hero">');
  const hero = html.slice(heroStart, html.indexOf("</header>", heroStart));
  assert.ok(hero.includes('id="f-date"'), "the election day picker is not in the hero");
  assert.ok(html.indexOf('id="f-date"') < html.indexOf('class="timeline-sec"'), "the picker must sit above the timeline section");
});

test("the timeline section has no orphan header", () => {
  const section = timelineSection();
  assert.ok(!section.includes("Campaign timeline"), "the orphan eyebrow still ships");
  assert.ok(!section.includes("sec-head"), "the orphan sec-head still ships");
});

test("the vote goal sits in the hero, left of the election day picker", () => {
  const heroStart = html.indexOf('<header class="hero">');
  const hero = html.slice(heroStart, html.indexOf("</header>", heroStart));
  assert.ok(hero.includes('id="f-target"'), "the vote goal is not in the hero");
  assert.ok(hero.indexOf('id="f-target"') < hero.indexOf('id="f-date"'), "the vote goal must sit left of the election day picker");
  assert.ok(html.indexOf('id="f-target"') < html.indexOf('class="timeline-sec"'), "the vote goal must sit above the timeline section");
});

test("the ask group is gone and three control groups remain", () => {
  const section = timelineSection();
  assert.ok(!section.includes("The ask"), "the ask eyebrow still ships");
  const controls = section.slice(section.indexOf('class="controls"'), section.indexOf('class="timeline-wrap"'));
  assert.equal((controls.match(/class="ctl-group"/g) || []).length, 3, "the controls should hold three groups");
});

test("the compact legend names the goal and confirmed votes", () => {
  const section = timelineSection();
  const from = section.indexOf('class="legend"');
  const legend = section.slice(from, section.indexOf("</div>", from));
  assert.ok(legend.includes("Confirmed Votes"), "the confirmed key is not named");
  assert.ok(legend.includes("Vote Goal"), "the goal key is not named");
  assert.ok(!legend.includes("Vote-goal pace"), "the old goal key still ships");
});
