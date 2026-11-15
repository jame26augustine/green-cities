// deck-ui.js
// Themes, the scroll cue, and the image lightbox.
// Press T to cycle colors. Wheel decisions live in deck-nav.js.

(function () {
  var STORAGE_KEY = "greenCitiesDeckSettings";
  var THEMES = ["whitefish", "night", "pine", "signal"];
  var wheelAt = 0;

  function defaults() {
    return { theme: "whitefish" };
  }

  function normalize(raw) {
    var settings = defaults();
    if (!raw || typeof raw !== "object") return settings;
    if (THEMES.indexOf(raw.theme) !== -1) settings.theme = raw.theme;
    return settings;
  }

  function load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch (error) {
      return defaults();
    }
  }

  function apply(settings) {
    settings = normalize(settings);
    document.documentElement.dataset.theme = settings.theme;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      // Private browsing can refuse storage. The theme still applies for this visit.
    }
    document.dispatchEvent(new Event("deck-theme"));
    return settings;
  }

  function cycleTheme() {
    var index = THEMES.indexOf(load().theme);
    if (index < 0) index = 0;
    apply({ theme: THEMES[(index + 1) % THEMES.length] });
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

  function onThemeKey(event) {
    if (event.key !== "t" && event.key !== "T") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.documentElement.classList.contains("ui-open")) return;
    var tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    event.preventDefault();
    cycleTheme();
  }

  function mount() {
    var settings = load();
    apply(settings);
    setupLightbox();
    updateCue();

    document.getElementById("scrollCue").addEventListener("click", function () {
      Reveal.down({ skipFragments: true });
    });

    document.addEventListener("keydown", onThemeKey);
    document.addEventListener("wheel", onDeckWheel, { passive: false });
    Reveal.on("slidechanged", function () {
      updateCue();
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
