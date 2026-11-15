// Opens the deck in Chrome and checks navigation, settings, and the lightbox.
// Start a static server in the repo root first, or pass DECK_URL.
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";

const url = process.env.DECK_URL || "http://127.0.0.1:8766/index.html";
const chrome = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const failures = [];
function check(name, ok, detail) {
  if (ok) console.log("ok  " + name);
  else {
    console.error("FAIL " + name + (detail ? " — " + detail : ""));
    failures.push(name + (detail ? ": " + detail : ""));
  }
}

async function indices(page) {
  return page.evaluate(() => Reveal.getIndices());
}
async function go(page, id) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    const index = Reveal.getIndices(el);
    Reveal.slide(index.h, index.v);
  }, id);
  await page.waitForFunction((id) => Reveal.getCurrentSlide() && Reveal.getCurrentSlide().id === id, {}, id);
}

const page = await browser.newPage();
page.on("pageerror", (error) => failures.push("pageerror: " + error.message));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.Reveal && Reveal.isReady());

const boot = await page.evaluate(() => ({
  locked: document.documentElement.classList.contains("locked"),
  gate: !!document.getElementById("gate"),
  visible: getComputedStyle(document.querySelector(".reveal")).visibility,
  keyboard: Reveal.getConfig().keyboard,
  touch: Reveal.getConfig().touch,
  number: document.querySelector(".slide-number")?.innerText || "",
  sideNav: document.querySelectorAll("#sideNav, #navToggle").length,
  draftLabels: document.querySelectorAll(".corner-badge, .wip-tag").length,
  revealLeft: document.querySelector(".reveal").getBoundingClientRect().left,
  lightboxCloseHit: document.elementFromPoint(1400, 30)?.id === "lightboxClose"
}));
check("deck is visible without a gate", !boot.locked && !boot.gate && boot.visible !== "hidden", JSON.stringify(boot));
check("keyboard and touch are on", boot.keyboard === true && boot.touch === true, JSON.stringify(boot));
check("slide number is visible", /\d+\s*·\s*\d+\/\d+/.test(boot.number), boot.number);
check("sidebar and draft labels are absent", boot.sideNav === 0 && boot.draftLabels === 0, JSON.stringify(boot));
check("slides are not shifted aside for a side list", boot.revealLeft < 40, JSON.stringify(boot));
check("lightbox close stays off the slides until an image opens", boot.lightboxCloseHit === false, JSON.stringify(boot));

await page.keyboard.press("ArrowRight");
await page.waitForFunction(() => /The Problem/.test(Reveal.getCurrentSlide()?.innerText || ""));
check("right arrow opens the next section", true);
await page.click(".navigate-right");
await page.waitForFunction(() => /The Inequalities/.test(Reveal.getCurrentSlide()?.innerText || ""));
check("on-screen arrow opens the next section", true);

await go(page, "sheet-slide");
const sheet = await indices(page);
check("google sheet slide is reachable", sheet.v === 0, JSON.stringify(sheet));
const cueOnSheet = await page.$eval("#scrollCue", (el) => !el.hidden);
check("scroll cue shows when a stack continues", cueOnSheet);

await page.keyboard.press("ArrowDown");
await page.waitForFunction(() => Reveal.getCurrentSlide()?.id === "totals-slide");
const totalsText = await page.$eval("#totals-slide", (el) => el.innerText);
check("down enters the solution check", /5 × 1,100 \+ 1 × 1,500 = 7,000 kWh/.test(totalsText), totalsText.slice(0, 120));
check("both inequalities are checked at (5, 1)", /200,000 ≤ 200,000/.test(totalsText) && /7,000 ≥ 6,000/.test(totalsText), totalsText.slice(0, 240));

const beforeRight = await indices(page);
await page.keyboard.press("ArrowRight");
await page.waitForFunction(() => /Summary/.test(Reveal.getCurrentSlide()?.innerText || ""));
const afterRight = await indices(page);
check("right leaves the stack for the next section", afterRight.h === beforeRight.h + 1 && afterRight.v === 0, JSON.stringify({ beforeRight, afterRight }));

await go(page, "thanks-slide");
const thanks = await indices(page);
const cueOnThanks = await page.$eval("#scrollCue", (el) => !el.hidden);
check("far-right section starts on thank you and can scroll down", thanks.v === 0 && cueOnThanks, JSON.stringify(thanks));
await page.keyboard.press("ArrowDown");
await page.waitForFunction(() => Reveal.getCurrentSlide()?.id === "code-math");
check("down from the end opens the code appendix", true);

await go(page, "code-stacks");
const scrolled = await page.evaluate(() => {
  const panel = document.querySelector("#code-stacks .code-panel");
  const event = new WheelEvent("wheel", { deltaY: 140, bubbles: true, cancelable: true });
  panel.dispatchEvent(event);
  const before = panel.scrollTop;
  panel.scrollTop = before + 40;
  return {
    prevented: event.defaultPrevented,
    moved: panel.scrollTop > before,
    id: Reveal.getCurrentSlide().id
  };
});
check("wheel inside a code panel does not change slides", scrolled.id === "code-stacks" && scrolled.prevented === false && scrolled.moved, JSON.stringify(scrolled));

await page.evaluate(() => {
  const panel = document.querySelector("#code-stacks .code-panel");
  panel.scrollTop = panel.scrollHeight;
});
const atEnd = await indices(page);
await page.mouse.wheel({ deltaY: 160 });
await new Promise((r) => setTimeout(r, 500));
const afterWheel = await indices(page);
check("wheel at the bottom of the last stack stays put", afterWheel.h === atEnd.h && afterWheel.v === atEnd.v, JSON.stringify({ atEnd, afterWheel }));

await go(page, "sheet-slide");
const heading = await page.$eval("#sheet-slide h2", (el) => {
  const rect = el.getBoundingClientRect();
  return { x: rect.x + 24, y: rect.y + rect.height / 2 };
});
await page.mouse.move(heading.x, heading.y);
await page.mouse.wheel({ deltaY: 160 });
await page.waitForFunction(() => Reveal.getCurrentSlide()?.id === "totals-slide");
check("wheel down moves to the next slide in the stack", true);

await page.waitForFunction(() => location.hash.includes("totals-slide"));
const hash = await page.evaluate(() => location.hash);
await page.goto(url.split("#")[0] + "#/7/1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.Reveal && Reveal.isReady());
await page.waitForFunction(() => Reveal.getCurrentSlide()?.id === "totals-slide");
check("numeric hash opens the solution check", true, hash);
await page.goto(url.split("#")[0] + hash, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.Reveal && Reveal.isReady());
await page.waitForFunction(() => Reveal.getCurrentSlide()?.id === "totals-slide");
check("id hash opens the solution check again", true, hash);

const settingsGone = await page.evaluate(() => ({
  button: !!document.getElementById("settingsOpen"),
  dialog: !!document.getElementById("settingsDialog"),
  help: !!document.getElementById("mathHelpBar")
}));
check("settings and math help are gone", settingsGone.button === false && settingsGone.dialog === false && settingsGone.help === false, JSON.stringify(settingsGone));
await page.keyboard.press("KeyT");
const night = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  stored: JSON.parse(localStorage.getItem("greenCitiesDeckSettings")).theme
}));
check("T switches to Night", night.theme === "night" && night.stored === "night", JSON.stringify(night));
await page.keyboard.press("KeyT");
await page.keyboard.press("KeyT");
await page.keyboard.press("KeyT");
const cycled = await page.evaluate(() => document.documentElement.dataset.theme);
check("T cycles back to Whitefish", cycled === "whitefish", cycled);
await page.keyboard.press("KeyT");

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.Reveal && Reveal.isReady());
const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
check("theme persists after reload", persisted === "night", persisted);

await page.evaluate(() => {
  localStorage.setItem("greenCitiesDeckSettings", JSON.stringify({ theme: "whitefish" }));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.Reveal && Reveal.isReady());

await page.evaluate(() => {
  const el = document.querySelector('[data-title="Design map"]');
  const index = Reveal.getIndices(el);
  Reveal.slide(index.h, index.v);
});
await page.waitForSelector("#designMapZoom");
await page.click("#designMapZoom");
await page.waitForSelector("#lightbox[open]");
const lightFocus = await page.evaluate(() => document.activeElement?.id);
check("lightbox focuses the close control", lightFocus === "lightboxClose", lightFocus);
await page.keyboard.press("Escape");
await page.waitForFunction(() => !document.getElementById("lightbox").open);
const focusBack = await page.evaluate(() => document.activeElement?.id);
check("escape closes the lightbox and returns focus", focusBack === "designMapZoom", focusBack);

await page.click("#designMapZoom");
await page.waitForSelector("#lightbox[open]");
await page.evaluate(() => {
  document.getElementById("lightbox").dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await page.waitForFunction(() => !document.getElementById("lightbox").open);
check("backdrop click closes the lightbox", true);

await page.click("#designMapZoom");
await page.waitForSelector("#lightbox[open]");
await page.click("#lightboxClose");
await page.waitForFunction(() => !document.getElementById("lightbox").open);
check("close button closes the lightbox", true);

await go(page, "planner-slide");
await page.click("#recommendBtn");
const meters = await page.evaluate(() => ({
  cost: document.getElementById("costText").textContent,
  energy: document.getElementById("energyText").textContent,
  x: document.getElementById("solarValue").textContent,
  y: document.getElementById("geoValue").textContent
}));
check("recommended mix is 5 and 1 at $200,000 and 7,000", meters.x === "5" && meters.y === "1" && meters.cost === "$200,000" && meters.energy === "7,000", JSON.stringify(meters));
const labels = await page.evaluate(() => {
  function status(x, y) {
    solarSlider.value = String(x);
    geoSlider.value = String(y);
    solarSlider.dispatchEvent(new Event("input"));
    return document.getElementById("badge").textContent;
  }
  return {
    great: status(5, 1),
    good: status(6, 0),
    short: status(5, 0),
    over: status(7, 1)
  };
});
check("status labels are Great, Good, and Bad", labels.great === "Great" && labels.good === "Good" && labels.short === "Bad · Not enough energy" && labels.over === "Bad · Over budget", JSON.stringify(labels));

async function slideText(page, title) {
  return page.evaluate((title) => {
    const el = document.querySelector('[data-title="' + title + '"]');
    const index = Reveal.getIndices(el);
    Reveal.slide(index.h, index.v);
    const box = el.getBoundingClientRect();
    return { text: (el.innerText || "").slice(0, 160), h: box.height, w: box.width };
  }, title);
}
const recommendation = await slideText(page, "Recommendation");
check("recommendation slide renders", recommendation.h > 80 && /Great/.test(recommendation.text), JSON.stringify(recommendation));
const sources = await slideText(page, "Sources");
check("sources slide renders", sources.h > 40 && /Sources/.test(sources.text) && /Class project data/.test(sources.text), JSON.stringify(sources));

const gateStatus = await page.evaluate(async () => {
  const response = await fetch("gate.js");
  return response.status;
});
check("gate script is not served", gateStatus === 404, String(gateStatus));

const phone = await browser.newPage();
await phone.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await phone.goto(url, { waitUntil: "domcontentloaded" });
await phone.waitForFunction(() => window.Reveal && Reveal.isReady());
const phoneBoot = await phone.evaluate(() => ({
  toggle: !!document.getElementById("navToggle"),
  sideNav: !!document.getElementById("sideNav"),
  narrow: document.body.classList.contains("nav-narrow"),
  settings: !!document.getElementById("settingsOpen"),
  heading: document.querySelector(".present h1, .present h2")?.innerText || ""
}));
check("phone has no slide-list control", phoneBoot.toggle === false && phoneBoot.sideNav === false && phoneBoot.narrow === false && phoneBoot.settings === false, JSON.stringify(phoneBoot));
await phone.keyboard.press("ArrowRight");
await phone.waitForFunction(() => /Problem/.test(Reveal.getCurrentSlide()?.innerText || ""));
check("phone arrow key still changes sections", true);

const session = await phone.createCDPSession();
await phone.evaluate(() => Reveal.slide(Reveal.getIndices(document.getElementById("sheet-slide")).h, 0));
await phone.waitForFunction(() => Reveal.getCurrentSlide()?.id === "sheet-slide");
const start = await phone.evaluate(() => {
  const r = document.querySelector("#sheet-slide h2").getBoundingClientRect();
  return { x: r.x + 20, y: r.y + r.height / 2 };
});
await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y, id: 0 }] });
await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x, y: start.y - 90, id: 0 }] });
await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await new Promise((r) => setTimeout(r, 400));
const touched = await phone.evaluate(() => Reveal.getCurrentSlide()?.id);
check("swipe up moves down the sheet stack", touched === "totals-slide", touched);

await browser.close();
if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nall browser checks passed");
