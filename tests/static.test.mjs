import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { decideWheel } = require("../deck-nav.js");

const root = path.resolve(import.meta.dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("password gate files and markers are gone", () => {
  assert.equal(fs.existsSync(path.join(root, "gate.js")), false);
  const html = read("index.html");
  const css = read("deck.css");
  const ui = read("deck-ui.js");
  const nav = read("deck-nav.js");
  for (const text of [html, css, ui, nav, read("planner.js"), read("README.md")]) {
    assert.doesNotMatch(text, /gate\.js/);
    assert.doesNotMatch(text, /class="locked"/);
    assert.doesNotMatch(text, /id="gate"/);
    assert.doesNotMatch(text, /password/i);
  }
});

test("school math is unchanged and solar means systems", () => {
  const html = read("index.html");
  const planner = read("planner.js");
  for (const text of [html, planner]) {
    assert.match(text, /30000x \+ 50000y/);
    assert.match(text, /1100x \+ 1500y/);
    assert.match(text, /30000/);
    assert.match(text, /200000|\$200,000/);
    assert.match(text, /1100/);
    assert.match(text, /1500/);
    assert.match(text, /6000|6,000/);
  }
  assert.match(html, /7,000/);
  assert.match(html, /\$200,000/);
  assert.match(html, /10 kW/);
  assert.match(html, /5 solar systems/);
  assert.match(planner, /solarSlider\.value = 5/);
  assert.match(planner, /geoSlider\.value = 1/);
  assert.match(html, /We have \$200,000 and need at least 6,000 kWh a month/);
  assert.doesNotMatch(html, /not one panel/);
  assert.doesNotMatch(html, /5 panels|solar panels|Panels on roofs/i);
});

test("sheet stack, solution check, and real code excerpts", () => {
  const html = read("index.html");
  const planner = read("planner.js");
  const nav = read("deck-nav.js");
  assert.match(html, /id="sheet-slide"/);
  assert.match(html, /id="totals-slide"/);
  assert.match(html, /id="thanks-slide"/);
  assert.doesNotMatch(html, /id="backup-slide"/);
  assert.doesNotMatch(html, /sheet-backup/);
  assert.doesNotMatch(html, /Empty screenshot slot/);
  assert.doesNotMatch(read("deck-ui.js"), /backupImg/);
  assert.equal(fs.existsSync(path.join(root, "images", "sheet-backup.png")), false);
  assert.equal(fs.existsSync(path.join(root, "images", "design-map.png")), false);
  assert.equal(fs.existsSync(path.join(root, "images", "city-animation.mp4")), true);
  assert.equal(fs.existsSync(path.join(root, "images", "city-animation-poster.jpg")), true);
  assert.match(html, /src="images\/city-animation\.mp4"/);
  assert.match(html, /poster="images\/city-animation-poster\.jpg"/);
  assert.match(html, /muted/);
  assert.match(html, /loop/);
  assert.match(html, /autoplay/);
  assert.match(html, /playsinline/);
  assert.match(html, /Our Whitefish Neighborhood/);
  assert.match(html, /Rooftop solar makes daytime power, and geothermal keeps homes warm in winter/);
  assert.doesNotMatch(html, /design-map\.png/);
  assert.doesNotMatch(html, /designMapZoom/);
  assert.match(html, /docs\.google\.com\/spreadsheets\/d\/1whMuZpSx6jRDZ3ja50ZYMfzMmvQwZYRUCGrA3F845Gw\/edit/);
  assert.doesNotMatch(html, /Class project data/);
  assert.doesNotMatch(html, /desmos\.com/);
  assert.doesNotMatch(html, /revealjs\.com/);
  assert.match(html, /function decideWheel\(input\)/);
  assert.match(nav, /function decideWheel\(input\)/);
  assert.match(nav, /does not jump to the next horizontal section/);
  assert.match(html, /function inBudget\(x, y\)/);
  assert.match(planner, /function inBudget\(x, y\)/);
  assert.match(html, /BUDGET \/ SOLAR_COST/);
  assert.match(planner, /BUDGET \/ SOLAR_COST/);
});

test("plain labels and the solution check stay on the slides", () => {
  const html = read("index.html");
  const planner = read("planner.js");
  assert.match(html, /x and y can't be negative/);
  assert.match(html, /whole numbers/);
  assert.match(html, /5 × 1,100 \+ 1 × 1,500 = 7,000 kWh/);
  assert.match(html, /30,000 × 5 \+ 50,000 × 1 = 200,000/);
  assert.match(html, /1,100 × 5 \+ 1,500 × 1 = 7,000/);
  assert.match(html, /The blue shade meets both inequalities/);
  assert.match(html, /is Great/);
  assert.match(html, /is Good/);
  assert.match(html, /\$20,000 less/);
  assert.match(html, /Press T to change colors/);
  assert.match(html, /Bad · Not enough energy/);
  assert.match(planner, /badge\.textContent = "Great"/);
  assert.match(planner, /badge\.textContent = "Good"/);
  assert.match(planner, /Bad · Over budget/);
  assert.doesNotMatch(html, />Feasible</);
  assert.doesNotMatch(html, /42 g/);
  assert.doesNotMatch(html, /EIA|Ember|Alliance for Innovation/);
  assert.doesNotMatch(html, /820/);
  assert.doesNotMatch(html, /id="settingsDialog"/);
  assert.doesNotMatch(html, /id="settingsOpen"/);
  assert.doesNotMatch(planner, /toPx\(1\.2, 2\.6\), -80/);
  assert.match(planner, /toPx\(1\.55, 0\.9\)/);
});

test("wheel stays inside a stack and leaves scrollable panels alone", () => {
  const routes = { up: true, down: true, left: true, right: true };
  assert.equal(decideWheel({ deltaY: 100, deltaX: 0, routes }), "down");
  assert.equal(decideWheel({ deltaY: -100, deltaX: 0, routes }), "up");
  assert.equal(decideWheel({ deltaY: 100, deltaX: 0, routes: { down: false, up: true } }), "ignore");
  assert.equal(decideWheel({ deltaX: 80, deltaY: 10, routes }), "right");
  assert.equal(decideWheel({ deltaX: -80, deltaY: 4, routes }), "left");
  assert.equal(decideWheel({ deltaY: 100, routes, scrollable: true }), "ignore");
  assert.equal(decideWheel({ deltaY: 100, routes, uiOpen: true }), "ignore");
  assert.equal(decideWheel({ deltaY: 8, deltaX: 2, routes }), "ignore");
});

test("draft material and the side list are gone", () => {
  const html = read("index.html");
  const css = read("deck.css");
  const ui = read("deck-ui.js");
  const readme = read("README.md");
  for (const text of [html, css, ui, readme, read("planner.js"), read("deck-nav.js")]) {
    assert.doesNotMatch(text, /id="sideNav"/);
    assert.doesNotMatch(text, /id="navToggle"/);
    assert.doesNotMatch(text, /buildSideNav/);
    assert.doesNotMatch(text, /corner-badge/);
    assert.doesNotMatch(text, /wip-tag/);
    assert.doesNotMatch(text, /coming-soon/);
    assert.doesNotMatch(text, /drafts\//);
    assert.doesNotMatch(text, />DRAFT</);
    assert.doesNotMatch(text, /draft/i);
  }
  assert.equal(fs.existsSync(path.join(root, "drafts")), false);
  assert.equal(fs.existsSync(path.join(root, "drafts", "later-slides.html")), false);
  assert.match(html, /id="scrollCue"/);
  assert.doesNotMatch(html, /id="settingsOpen"/);
  assert.match(html, /controls:\s*true/);
});

test("themes, lightbox, slide numbers, and direct-link settings exist", () => {
  const html = read("index.html");
  const css = read("deck.css");
  assert.doesNotMatch(html, /id="settingsDialog"/);
  assert.doesNotMatch(html, /id="lightbox"/);
  assert.match(html, /id="scrollCue"/);
  assert.match(html, /keyboard:\s*true/);
  assert.match(html, /hash:\s*true/);
  assert.match(html, /navigationMode:\s*"default"/);
  assert.match(html, /slideNumber:/);
  assert.match(css, /data-theme="night"/);
  assert.match(css, /data-theme="pine"/);
  assert.match(css, /data-theme="signal"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(read("deck-ui.js"), /function cycleTheme/);
});
