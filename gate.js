// ===================================================
// gate.js: a simple password screen for the deck.
//
// ⚠ LIGHT PROTECTION ONLY. This site is public, and everything
// (HTML, slides, this file) can be downloaded and read by anyone
// who knows how. This gate just keeps casual visitors out.
// Never use it for real secrets.
//
// We store a SHA-256 "hash" of the password instead of the password
// itself. A hash is a scrambled fingerprint: the same input always
// gives the same hash, but you can't easily turn it back into the
// password. (A short number like 1428 could still be guessed by
// trying them all, which is why this is only light protection.)
// ===================================================

// SHA-256 hash of the password (made with: printf 1428 | sha256sum)
const PASSWORD_HASH = "da4bb298d82e8b0c1cde703b60549806e385df057824e9c9b032167c945b0fa8";

// sessionStorage remembers things until the browser tab is closed
const STORAGE_KEY = "greenCitiesUnlocked";

// ----- Turn text into its SHA-256 hash (as a hex string) -----
async function sha256(text) {
  const bytes = new TextEncoder().encode(text);                // text -> bytes
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))                // bytes -> "a3f0..."
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ----- Show the deck and turn Reveal's keyboard back on -----
function unlock() {
  document.documentElement.classList.remove("locked");  // CSS hides the gate
  Reveal.configure({ keyboard: true });                 // arrow keys work again
  Reveal.layout();                                      // re-measure the slides
}

// ----- If already unlocked in this tab, skip the gate -----
if (sessionStorage.getItem(STORAGE_KEY) === "yes") {
  unlock();
}

// ----- Check the password when the form is submitted -----
// A <form> submits when you click the button OR press Enter in the box.
const gateForm = document.getElementById("gateForm");
const gateInput = document.getElementById("gateInput");
const gateError = document.getElementById("gateError");

gateForm.addEventListener("submit", async function (event) {
  event.preventDefault();               // stop the page from reloading
  const guessHash = await sha256(gateInput.value);
  if (guessHash === PASSWORD_HASH) {
    sessionStorage.setItem(STORAGE_KEY, "yes");
    gateError.textContent = "";
    unlock();
  } else {
    gateError.textContent = "Wrong password, try again";
    gateInput.value = "";
    gateInput.focus();
  }
});

// Keys typed into the gate stay in the gate, so they never reach Reveal
document.getElementById("gate").addEventListener("keydown", function (event) {
  event.stopPropagation();
});
