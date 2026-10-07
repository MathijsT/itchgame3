# Silicon Garage: A Hardware Tycoon

A browser tycoon game about building a hardware company from a garage in 1977 to a tech giant in 2041.
Design desktops, consoles, microprocessors, laptops, handhelds, phones, graphics cards, tablets,
smartwatches, VR headsets and AI accelerators, and outbuild rivals like Pear Computer, Intol and Nvydia.

Inspired by Haxor's unfinished hardware tycoon game.

It's plain HTML, CSS and JavaScript (ES modules) with no dependencies and no build step, so it runs on itch.io as-is.

## Features

- **Product designer**: pick components from 14 technology lines (processors, memory, displays, batteries,
  process nodes, AI engines…), balance them, set the engineering focus (performance, reliability, cost) and the development time.
- **Market simulation**: budget, mainstream and enthusiast buyers weigh performance against today's tech, price,
  quality, brand and hype. Every product competes against real rival products in an 11-category market.
- **Pricing tool**: a live chart of estimated weekly profit against price, so launch pricing is a real decision.
- **Press reviews** from four magazines, with scores that move your brand.
- **31 parody rivals** (plus a crowd of no-name clone makers) that enter and leave markets on a rough historical schedule, react when you dominate,
  can go bankrupt, and can be bought out.
- **Research**: 230+ technologies from 1975 to 2038, prototype research up to two years early, new markets to unlock and company upgrades.
- **Staff**: hire engineers, researchers and marketers, train them, and grow from a garage to a tech campus
  (shown as a pixel-art office that changes with the era).
- **Factories, labs, loans, acquisitions, random events** (headhunters, patent trolls, recalls, VC offers…) and
  historical events (the 1983 video game crash, the dot-com boom and bust, the smartphone revolution, the chip shortage…).
- Three starting eras (1977, 1992, 2007), three difficulties, 17 achievements, a hall of fame, autosave, and save export/import.
- Procedural sound effects (WebAudio). No asset files.

## Play locally

ES modules need to be served over HTTP (opening `index.html` straight from disk won't work in most browsers):

```sh
npm start            # serves the game at http://localhost:8080
# or: python3 -m http.server 8080
```

## Publish on itch.io

1. Build the upload zip (needs Node 18+, no `npm install` required):
   ```sh
   npm run package    # writes dist/silicon-garage-web.zip
   ```
   You can also zip `index.html`, `css/` and `src/` yourself; `index.html` must be at the root of the zip.
2. On itch.io, create a new project and set **Kind of project** to **HTML**.
3. Upload `silicon-garage-web.zip` and tick **This file will be played in the browser**.
4. Under **Embed options** use a viewport of **1280 × 720** (960 × 600 also works), and enable
   **Mobile friendly** and **Fullscreen button** if you like.
5. Save and view the page.

Saves live in the player's browser (`localStorage`), so they survive page reloads and game updates on itch.

## Development

```sh
npm test             # headless balance simulation: a bot plays several full campaigns, fails on bankruptcy or NaN
npm run sim          # one verbose campaign with yearly stats (flags: --seed N --era 1992 --difficulty hard --naive --early --size)
npm run smoke        # browser smoke test with Playwright (needs the playwright package and a Chromium)
```

### Layout

```
index.html           page shell
css/style.css        all styles
src/main.js          boot, title screen, new game, game loop
src/data/            static game data: technologies, categories, rivals, events, perks, facilities
src/sim/             the simulation (no DOM; runs in Node for testing)
  game.js            new game, weekly tick, player actions
  market.js          nested-logit demand model and sales estimates
  design.js          product evaluation and press reviews
  rivals.js          rival product releases, pricing, bankruptcies
  events.js          scripted and random events
src/ui/              rendering: tabs, modals, designer wizard, launch flow, charts, pixel-art office, sound
tools/               balance simulator, browser smoke test, itch.io packager
```

The simulation is deterministic for a given seed. Most balance knobs live in `src/data/constants.js`
and the data files.

## Notes

All companies and products are parodies. The tech timeline is loosely historical and runs into the
future after 2026.
