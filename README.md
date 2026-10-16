# Green Cities: Powering Whitefish (Reveal.js deck)

## Open it
Double-click `index.html`. Use the arrow keys or Space to move between slides. Press `F` for fullscreen and `Esc` for a slide overview.
reveal.js 6.0.2 is saved in `vendor/`, so the deck works without internet.

## Files
- `index.html` has the slides (each `<section>` is one slide) and starts Reveal
- `deck.css` holds the blue design (colors are CSS variables at the top) and the planner layout
- `planner.js` is the interactive slide (same math and graph code as the starter site)
- `drafts/later-slides.html` holds finished slides that aren't in the deck yet (copy a `<section>` back into index.html to use it)
- `vendor/` contains the reveal.js library files (MIT license)

## Host it free on GitHub Pages
1. Create a public repo named `green-cities` on github.com.
2. Upload everything in this folder, including `vendor/`, to the repo root.
3. Go to Settings → Pages, choose Branch `main` and `/ (root)`, then click Save.
4. After 1–2 minutes the deck is at https://jame26augustine.github.io/green-cities/

From a terminal that is logged in with `gh auth login`, you can do it this way instead:
    git init && git add . && git commit -m "Green Cities deck" && git branch -M main
    gh repo create jame26augustine/green-cities --public --source=. --push
    gh api -X POST repos/jame26augustine/green-cities/pages -f "source[branch]=main" -f "source[path]=/"
