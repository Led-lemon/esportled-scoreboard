# Contributing to EsportLed Scoreboard

Thanks for helping improve EsportLed Scoreboard, an open-source sports LED
scoreboard and broadcast graphics project by EsportLed / LedLemon.

## Development Setup

Run the web version:

```bash
python3 -m http.server 8080
```

Open:

- Control: <http://localhost:8080/index.html>
- Lower-third output: <http://localhost:8080/output.html>
- Full-screen output: <http://localhost:8080/display.html>

Run the Electron/NDI app:

```bash
cd ndi-app
npm install
npm start
```

## Checks

Before opening a pull request:

```bash
npm run check
```

If you do not use npm from the repo root, run the same checks manually:

```bash
node --check engine.js
node --check scoreboard.js
node --check control.js
node --check output.js
node --check display.js
node --check bridge.js
node --check ndi-app/main.js
```

## Project Conventions

- Keep sports rules and shared state in `engine.js`.
- Route operator actions through `COMMANDS` in `control.js`.
- Use `publish()` for state sync.
- Keep broadcast rendering in `scoreboard.js` and `scoreboard.css`.
- Do not commit generated installers, `dist/`, `build/` or `node_modules/`.
- The operator UI is currently Spanish; public documentation should stay
  English-first for discoverability.

## Good First Contributions

- Add screenshots or short GIFs to the README.
- Improve setup instructions for OBS, Resolume or NDI.
- Add new sport presets with clear scoring rules.
- Improve accessibility and keyboard operation in the Control UI.
- Test on Windows/Linux desktop builds and report results.

## Trademarks

The code is Apache-2.0 licensed. EsportLed and LedLemon names and logos remain
trademarks/trade names of their respective owners.
