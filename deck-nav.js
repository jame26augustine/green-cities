// deck-nav.js
// Decides what a mouse wheel or trackpad scroll should do.
// Vertical movement stays inside a stack. Horizontal movement
// changes sections.
//
// The same function is used by the deck and by the node tests.

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DeckNav = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Ignore tiny trackpad jitter. A real flick is larger than this.
  var WHEEL_THRESHOLD = 24;

  function decideWheel(input) {
    if (!input || input.uiOpen || input.scrollable) return "ignore";
    var deltaX = input.deltaX || 0;
    var deltaY = input.deltaY || 0;
    var routes = input.routes || {};
    var absX = Math.abs(deltaX);
    var absY = Math.abs(deltaY);
    if (Math.max(absX, absY) < WHEEL_THRESHOLD) return "ignore";
    // Vertical wheel moves down or up inside the current stack.
    // It does not jump to the next horizontal section.
    if (absY >= absX) {
      if (deltaY > 0 && routes.down) return "down";
      if (deltaY < 0 && routes.up) return "up";
      return "ignore";
    }
    if (deltaX > 0 && routes.right) return "right";
    if (deltaX < 0 && routes.left) return "left";
    return "ignore";
  }

  return { WHEEL_THRESHOLD: WHEEL_THRESHOLD, decideWheel: decideWheel };
});
