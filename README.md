# Dirt Road Field Plan Calculator

An embeddable planning calculator for campaigns: whether a door-knock field can
confirm more votes than its vote goal by Election Day.

Domain language lives in [CONTEXT.md](./CONTEXT.md).

## Running it

```sh
npm test        # node --test — the pure model
npm run build   # rebuild index.html once
npm run dev     # rebuild index.html on every save under src/
```

Both need the flake devShell (`nix develop`), which provides node.

## Layout

- `src/plan.js` — the model: `plan()` sizes the initial universe, `simulate()` runs it day by day
- `src/election.js` — Election Day logic (first Tuesday after the first Monday in November, next upcoming)
- `src/template.html` — page shell; `/*__STYLE__*/` and `/*__INLINE:...__*/` markers
- `src/styles.css` — all page styling, scoped under `#drc`
- `src/app.js` — the DOM layer: reads the controls and draws the timeline
- `build.mjs` — inlines the stylesheet and modules into the shell → `index.html`
- `dev.mjs` — watches `src/` and reruns the build on save
- `index.html` — the built, committed, single-file artifact

`index.html` is generated — edit `src/` and rebuild, never edit it by hand.
