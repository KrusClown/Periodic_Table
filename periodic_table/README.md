# Periodic Playground

An interactive, animated 3D periodic table for learning chemistry the fun way.
Pure HTML, CSS, JavaScript and Canvas. No build step, no dependencies.

## Run it
Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
Optional local server: `python3 -m http.server` then visit http://localhost:8000

## Folder structure
```
periodic-playground/
├── index.html      Page structure (header, toolbar, 3D stage, learn panels, element card)
├── css/
│   └── styles.css  Colors, tiles, 3D transforms, animations, responsive layout
├── js/
│   ├── data.js     All 118 elements + family and state descriptions
│   └── app.js      Layouts (table/sphere/helix/cube), drag & zoom, legend,
│                   atom canvas, quiz game, confetti and background effects
└── README.md
```

## Features
- 4 views that morph in 3D: Table, Sphere, Helix, Cube (drag to spin, +/− to zoom)
- Color by Family, State (solid/liquid/gas) or Weight
- Click a tile: flipping card with a spinning 3D atom (tap it to zap the electrons),
  protons/neutrons/electrons, shells, electron configuration, and "Say it" voice
- Real-life example for every element
- "Find it!" quiz with hints, streaks and confetti
- Search by name, symbol, number or use (try "battery")
- Keyboard: Tab/Enter on tiles, ←/→ in the card, Esc to close
- Respects "reduce motion" settings

## Edit the content
Change examples or emojis in `js/data.js` (one line per element: `Symbol|Name|Mass|Emoji|Example`).
Change the candy colors in the `:root` block at the top of `css/styles.css`.

Fonts load from Google Fonts; offline the page falls back to system fonts.
