# Green Cities: Powering Whitefish (Reveal.js deck)

## Open it
Double-click `index.html`. No sign-in screen: a link such as `#/7/1` opens that slide directly.
reveal.js 6.0.2 is saved in `vendor/`, so the deck works without internet. The live Google Sheet frame needs a connection; the totals slide does not.

## Moving around
- `←` and `→` change sections, including the last section, which continues downward.
- `↓`, the Scroll down button, a vertical swipe, and the mouse wheel move down inside a stack. They do not skip to the next section.
- Space and `N` move forward, including down a stack, and then on to the next section.
- Slide numbers sit at the lower right (`8.2 · 9/15`).
- Scrolling inside a code box stays in that box. Scrolling inside the Google Sheet stays in the sheet.
- Click or tap a picture to enlarge it. Close with Escape, the Close button, or the dark backdrop.
- Settings (top left) stores the theme, transition, motion, and math-layout help in this browser.

## Files
- `index.html` has the slides. A section inside a section is a vertical stack.
- `deck.css` holds the Whitefish colors, the Night, Pine, and Signal themes, and the planner layout
- `planner.js` is the interactive slide (same cost and energy math as the starter site)
- `deck-nav.js` decides whether a wheel event changes slides
- `deck-ui.js` builds settings, the lightbox, and the scroll cue
- `vendor/` contains the reveal.js library files (MIT license)

## Checks
`npm test` runs the file checks. `npm run test:browser` opens the deck in Chrome and clicks through navigation, settings, and the lightbox.

## Host it free on GitHub Pages
1. Create a public repo named `green-cities` on github.com.
2. Upload everything in this folder, including `vendor/`, to the repo root.
3. Go to Settings → Pages, choose Branch `main` and `/ (root)`, then click Save.
4. After 1–2 minutes the deck is at https://jame26augustine.github.io/green-cities/

From a terminal that is logged in with `gh auth login`, you can do it this way instead:
    git init && git add . && git commit -m "Green Cities deck" && git branch -M main
    gh repo create jame26augustine/green-cities --public --source=. --push
    gh api -X POST repos/jame26augustine/green-cities/pages -f "source[branch]=main" -f "source[path]=/"
