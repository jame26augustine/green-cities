// deck-ui.js
// Settings, themes, the scroll cue, and the image lightbox.
// Wheel decisions live in deck-nav.js so they can be tested on their own.

(function () {
  var STORAGE_KEY = "greenCitiesDeckSettings";
  var THEMES = ["whitefish", "night", "pine", "signal"];
  var TRANSITIONS = ["slide", "fade", "red-fade", "none"];
  var MOTIONS = ["system", "reduce", "allow"];
  var wheelAt = 0;

  function defaults() {
    return { theme: "whitefish", transition: "slide", motion: "system", mathHelp: false };
  }

  function normalize(raw) {
    var settings = defaults();
    if (!raw || typeof raw !== "object") return settings;
    if (THEMES.indexOf(raw.theme) !== -1) settings.theme = raw.theme;
    if (TRANSITIONS.indexOf(raw.transition) !== -1) settings.transition = raw.transition;
    if (MOTIONS.indexOf(raw.motion) !== -1) settings.motion = raw.motion;
    settings.mathHelp = !!raw.mathHelp;
    return settings;
  }

  function load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch (error) {
      return defaults();
    }
  }

  function motionReduced(settings) {
    if (settings.motion === "reduce") return true;
    if (settings.motion === "allow") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function applyTransition(settings) {
    var reduced = motionReduced(settings);
    var choice = settings.transition;
    document.documentElement.classList.toggle("fx-red-fade", !reduced && choice === "red-fade");
    if (!window.Reveal || typeof Reveal.configure !== "function") return;
    if (reduced || choice === "none") {
      Reveal.configure({ transition: "none", transitionSpeed: "fast" });
    } else if (choice === "red-fade") {
      Reveal.configure({ transition: "fade", transitionSpeed: "fast" });
    } else {
      Reveal.configure({ transition: choice, transitionSpeed: "fast" });
    }
  }

  function apply(settings) {
    settings = normalize(settings);
    var root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.motion = settings.motion;
    root.classList.toggle("math-help", settings.mathHelp);
    var bar = document.getElementById("mathHelpBar");
    if (bar) bar.hidden = !settings.mathHelp;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      // Private browsing can refuse storage. The theme still applies for this visit.
    }
    applyTransition(settings);
    document.dispatchEvent(new Event("deck-theme"));
    return settings;
  }

  function canScroll(el, deltaY) {
    if (!el) return false;
    var style = getComputedStyle(el);
    if (!/(auto|scroll|overlay)/.test(style.overflowY)) return false;
    if (el.scrollHeight <= el.clientHeight + 2) return false;
    if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    if (deltaY < 0) return el.scrollTop > 1;
    return false;
  }

  function wheelScrollable(event) {
    if (event.target.closest && event.target.closest("input, textarea, select, iframe")) return true;
    var panel = event.target.closest ? event.target.closest(".scroll-panel") : null;
    return !!(panel && canScroll(panel, event.deltaY));
  }

  function onDeckWheel(event) {
    var uiOpen = document.documentElement.classList.contains("ui-open");
    var scrollable = wheelScrollable(event);
    if (uiOpen || scrollable) return;
    var routes = Reveal.availableRoutes({ includeFragments: true });
    var action = window.DeckNav.decideWheel({
      uiOpen: false,
      scrollable: false,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      routes: routes
    });
    if (action === "ignore") return;
    var now = Date.now();
    if (now - wheelAt < 480) {
      event.preventDefault();
      return;
    }
    wheelAt = now;
    event.preventDefault();
    Reveal[action]();
  }

  function updateCue() {
    var cue = document.getElementById("scrollCue");
    if (!cue) return;
    var down = Reveal.availableRoutes().down;
    cue.hidden = !down;
  }

  function openDialog(dialog, opener) {
    dialog.dataset.openerId = opener && opener.id ? opener.id : "";
    document.documentElement.classList.add("ui-open");
    dialog.showModal();
    var closeButton = dialog.querySelector("[data-close]");
    if (closeButton) closeButton.focus();
  }

  function bindDialog(dialog) {
    dialog.addEventListener("close", function () {
      if (!document.querySelector("dialog[open]")) {
        document.documentElement.classList.remove("ui-open");
      }
      var opener = dialog.dataset.openerId && document.getElementById(dialog.dataset.openerId);
      if (opener) opener.focus();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll("[data-close]").forEach(function (button) {
      button.addEventListener("click", function () { dialog.close(); });
    });
  }

  function setupLightbox() {
    var dialog = document.getElementById("lightbox");
    var view = document.getElementById("lightboxImg");
    bindDialog(dialog);
    document.addEventListener("click", function (event) {
      var hit = event.target.closest && event.target.closest(".zoom-hit");
      if (!hit || hit.hidden) return;
      var img = hit.querySelector("img");
      if (!img || !img.getAttribute("src") || img.naturalWidth === 0) return;
      event.preventDefault();
      view.src = img.currentSrc || img.src;
      view.alt = img.alt || "Enlarged image";
      openDialog(dialog, hit);
    });
  }

  function setupSettings(settings) {
    var dialog = document.getElementById("settingsDialog");
    var theme = document.getElementById("themeSelect");
    var transition = document.getElementById("transitionSelect");
    var motion = document.getElementById("motionSelect");
    var mathHelp = document.getElementById("mathHelp");
    theme.value = settings.theme;
    transition.value = settings.transition;
    motion.value = settings.motion;
    mathHelp.checked = settings.mathHelp;
    bindDialog(dialog);
    function commit() {
      apply({
        theme: theme.value,
        transition: transition.value,
        motion: motion.value,
        mathHelp: mathHelp.checked
      });
    }
    dialog.addEventListener("change", commit);
    document.getElementById("settingsOpen").addEventListener("click", function () {
      openDialog(dialog, document.getElementById("settingsOpen"));
    });
    var media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.addEventListener) {
      media.addEventListener("change", function () {
        if (load().motion === "system") apply(load());
      });
    }
  }

  function flashRed() {
    if (!document.documentElement.classList.contains("fx-red-fade")) return;
    var wash = document.querySelector(".red-wash");
    if (!wash) return;
    wash.classList.remove("wash-on");
    void wash.offsetWidth;
    wash.classList.add("wash-on");
  }

  function mount() {
    var settings = load();
    apply(settings);
    setupLightbox();
    setupSettings(settings);
    updateCue();

    document.getElementById("scrollCue").addEventListener("click", function () {
      Reveal.down({ skipFragments: true });
    });

    document.addEventListener("wheel", onDeckWheel, { passive: false });
    Reveal.on("slidechanged", function () {
      updateCue();
      flashRed();
    });
    Reveal.on("fragmentshown", updateCue);
    Reveal.on("fragmenthidden", updateCue);
    Reveal.on("ready", function () {
      apply(load());
      updateCue();
    });
  }

  window.DeckUI = { load: load, apply: apply, mount: mount, normalize: normalize };
})();
