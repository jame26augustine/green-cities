
// planner.js: the interactive slide.
// This is the SAME math and drawing code as site/script.js.
// The difference: everything starts inside startPlanner(), which
// index.html calls when the planner slide is shown.

// ----- 1. The numbers from the problem -----
const SOLAR_COST = 30000;     // dollars per solar unit
const SOLAR_ENERGY = 1100;    // kWh per month per solar unit
const GEO_COST = 50000;       // dollars per geothermal unit
const GEO_ENERGY = 1500;      // kWh per month per geothermal unit
const BUDGET = 200000;        // max dollars we can spend
const ENERGY_GOAL = 6000;     // min kWh per month we need
const MAX_UNITS = 7;          // sliders and graph go from 0 to 7

// ----- 2. Math functions (the algebra!) -----
function totalCost(x, y)   { return SOLAR_COST * x + GEO_COST * y; }
function totalEnergy(x, y) { return SOLAR_ENERGY * x + GEO_ENERGY * y; }

// Budget: 30000x + 50000y ≤ 200000
function inBudget(x, y)    { return totalCost(x, y) <= BUDGET; }
// Energy: 1100x + 1500y ≥ 6000
function enoughEnergy(x, y) { return totalEnergy(x, y) >= ENERGY_GOAL; }
// A point is feasible when BOTH inequalities are true
function isFeasible(x, y)  { return inBudget(x, y) && enoughEnergy(x, y); }

// ----- 3. Page elements (filled in by startPlanner) -----
let solarSlider, geoSlider, solarValue, geoValue, costText, energyText;
let costBar, energyBar, badge, recommendBtn, canvas, ctx;
let PAD, SCALE;               // graph layout numbers, set once canvas exists
let started = false;          // so we only set things up one time

// ----- 4. Update meters and badge -----
function update() {
  const x = Number(solarSlider.value);
  const y = Number(geoSlider.value);
  const cost = totalCost(x, y);
  const energy = totalEnergy(x, y);

  solarValue.textContent = x;
  geoValue.textContent = y;
  costText.textContent = "$" + cost.toLocaleString("en-US");
  energyText.textContent = energy.toLocaleString("en-US");

  // Bars fill as a percent (capped at 100%)
  costBar.style.width = Math.min(cost / BUDGET * 100, 100) + "%";
  energyBar.style.width = Math.min(energy / ENERGY_GOAL * 100, 100) + "%";
  costBar.classList.toggle("bad", !inBudget(x, y));
  energyBar.classList.toggle("bad", !enoughEnergy(x, y));

  // Badge: check budget first, then energy
  if (!inBudget(x, y)) {
    badge.textContent = "Over budget";
    badge.className = "badge over";
  } else if (!enoughEnergy(x, y)) {
    badge.textContent = "Not enough energy";
    badge.className = "badge short";
  } else {
    badge.textContent = "Feasible";
    badge.className = "badge feasible";
  }

  drawGraph(x, y);
}

// ----- 5. Drawing the graph on the canvas -----
// PAD and SCALE are set in startPlanner()

// Convert graph coordinates (x, y) into canvas pixels.
// Canvas y goes DOWN, so we flip it.
function toPx(x, y) {
  return [PAD + x * SCALE, canvas.height - PAD - y * SCALE];
}

// Draw a straight line between two graph points
function line(x1, y1, x2, y2, color, width) {
  const [a, b] = toPx(x1, y1);
  const [c, d] = toPx(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a, b);
  ctx.lineTo(c, d);
  ctx.stroke();
}

// Draw a filled circle at a graph point
function dot(x, y, radius, fill, outline) {
  const [px, py] = toPx(x, y);
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawGraph(curX, curY) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid lines and numbers
  ctx.font = "12px Arial";
  ctx.fillStyle = "#333";
  for (let i = 0; i <= MAX_UNITS; i++) {
    line(i, 0, i, MAX_UNITS, "#e0e0e0", 1);
    line(0, i, MAX_UNITS, i, "#e0e0e0", 1);
    const [px, py] = toPx(i, 0);
    ctx.fillText(i, px - 3, py + 16);
    const [qx, qy] = toPx(0, i);
    ctx.fillText(i, qx - 16, qy + 4);
  }
  line(0, 0, MAX_UNITS, 0, "#333", 2);   // x-axis
  line(0, 0, 0, MAX_UNITS, "#333", 2);   // y-axis
  ctx.fillText("x = solar units", canvas.width / 2 - 40, canvas.height - 12);
  ctx.save();
  ctx.translate(14, canvas.height / 2 + 50);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("y = geothermal units", 0, 0);
  ctx.restore();

  // Shade the feasible region: color every tiny cell whose
  // center makes both inequalities true. Simple and accurate!
  ctx.fillStyle = "rgba(67, 160, 71, 0.35)";
  const step = 0.02;
  for (let gx = 0; gx < MAX_UNITS; gx += step) {
    for (let gy = 0; gy < MAX_UNITS; gy += step) {
      if (isFeasible(gx + step / 2, gy + step / 2)) {
        const [px, py] = toPx(gx, gy + step);
        ctx.fillRect(px, py, step * SCALE + 0.5, step * SCALE + 0.5);
      }
    }
  }

  // Budget line: 30000x + 50000y = 200000 -> (0, 4) to (6.67, 0)
  line(0, BUDGET / GEO_COST, BUDGET / SOLAR_COST, 0, "#c62828", 2);
  // Energy line: 1100x + 1500y = 6000 -> (0, 4) to (5.45, 0)
  line(0, ENERGY_GOAL / GEO_ENERGY, ENERGY_GOAL / SOLAR_ENERGY, 0, "#0277bd", 2);
  ctx.fillStyle = "#c62828";
  ctx.fillText("Budget line", ...offset(toPx(5.2, 1.3)));
  ctx.fillStyle = "#0277bd";
  ctx.fillText("Energy line", ...offset(toPx(1.2, 2.6), -80));

  // Dots for every whole-number feasible mix
  for (let x = 0; x <= MAX_UNITS; x++) {
    for (let y = 0; y <= MAX_UNITS; y++) {
      if (isFeasible(x, y)) dot(x, y, 5, "#1b5e20");
    }
  }

  // Highlight the current slider choice
  dot(curX, curY, 9, "#f9a825", "#333");
}

// Small helper to nudge a label so it doesn't sit on the line
function offset([px, py], dx = 6) { return [px + dx, py]; }

// ----- 6. Start the planner (called when its slide appears) -----
// Note on scaling: Reveal shrinks/grows the whole slide with CSS.
// The canvas always draws in its own 500x500 pixel grid, so the
// picture scales with the slide and nothing needs redrawing.
function startPlanner() {
  if (started) return;
  started = true;

  solarSlider = document.getElementById("solarSlider");
  geoSlider = document.getElementById("geoSlider");
  solarValue = document.getElementById("solarValue");
  geoValue = document.getElementById("geoValue");
  costText = document.getElementById("costText");
  energyText = document.getElementById("energyText");
  costBar = document.getElementById("costBar");
  energyBar = document.getElementById("energyBar");
  badge = document.getElementById("badge");
  recommendBtn = document.getElementById("recommendBtn");
  canvas = document.getElementById("graph");
  ctx = canvas.getContext("2d");

  PAD = 50;
  SCALE = (canvas.width - 2 * PAD) / MAX_UNITS;

  solarSlider.addEventListener("input", update);
  geoSlider.addEventListener("input", update);
  recommendBtn.addEventListener("click", function () {
    solarSlider.value = 5;
    geoSlider.value = 1;
    update();
  });

  update();   // draw the first picture
}
