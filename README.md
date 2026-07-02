# EsportLed Scoreboard

Open-source **sports LED scoreboard** and **broadcast graphics** software for
**OBS**, **Resolume**, browser sources and **NDI**. Built for live sports events,
LED screens, video scoreboards, stadium displays and streaming overlays by
**EsportLed**, a **LedLemon** project.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-f7df1e)](engine.js)
[![Electron NDI](https://img.shields.io/badge/Electron-NDI-47848f)](ndi-app/)
[![OBS / Resolume](https://img.shields.io/badge/Output-OBS%20%2F%20Resolume-f94e41)](#outputs-for-obs-resolume-and-ndi)

EsportLed Scoreboard is a lightweight, framework-free scoreboard app for sports
production. It gives an operator a control console and sends clean transparent
outputs to production tools: a lower-third scoreboard, a full-screen stadium
scoreboard, sponsor ticker graphics and optional desktop NDI sources with alpha.

> The operator interface is currently in Spanish. The project documentation is
> English-first so it can be discovered by the wider GitHub, OBS, Resolume and
> LED scoreboard community.

## Why this project exists

Most sports scoreboard projects are tied to one sport, one LED matrix size or
one hardware stack. EsportLed Scoreboard is designed for live event operators:
open it in a browser, add the outputs to OBS or Resolume, or run the desktop app
and get NDI sources ready for broadcast compositing.

It is useful for:

- sports LED scoreboard installations,
- OBS sports score overlays,
- Resolume Web/NDI layers,
- venue screens and fan-zone displays,
- broadcast lower thirds,
- local tournaments and club events,
- football, basketball, volleyball, tennis, padel and rugby productions.

## Features

- Operator control console with live preview.
- Transparent lower-third scoreboard for OBS and Resolume.
- Full-screen stadium scoreboard for LED screens and projectors.
- Electron desktop app with NDI outputs and alpha channel.
- Sponsor logo ticker / advertising banner.
- Custom team names, abbreviations, colors and logos.
- Custom backgrounds: solid color, uploaded image or folder gallery.
- Match history with full save/reload.
- Keyboard shortcuts for Stream Deck hotkeys.
- Optional WebSocket bridge for Stream Deck web requests.
- MIDI Learn for pads, keys and controllers in compatible browsers.
- No frontend framework and no build step for the web version.

## Supported Sports

| Sport | Included rules |
|---|---|
| Football / Soccer | Goals, fouls, yellow/red cards, two halves, extra time and added time |
| Basketball | +1/+2/+3 scoring, fouls, possession, quarters and overtime |
| Volleyball | Points, sets, automatic serve side-out and best of 3/5 |
| Tennis | 0/15/30/40/AD, deuce, games, sets and tie-break |
| Padel | Tennis-style scoring with configurable golden point |
| Rugby | Try +5, conversion +2, penalty/drop +3, cards and added time |

## Quick Start: Web Version

Serve the repository over HTTP. Do not open the HTML files through `file://`,
because ES modules, MIDI and some browser sync features need an HTTP origin.

```bash
cd esportled-scoreboard
python3 -m http.server 8080
```

Open:

- Control console: <http://localhost:8080/index.html>
- Lower-third output: <http://localhost:8080/output.html>
- Full-screen output: <http://localhost:8080/display.html>

Outputs are transparent by default. For standalone testing with a built-in
background:

- `output.html?bg=solid`
- `display.html?bg=solid`

## Desktop App with NDI

The Electron app source lives in [`ndi-app/`](ndi-app/). Generated installers
are intentionally ignored by git.

```bash
cd ndi-app
npm install
npm start
```

The desktop app:

- serves the web scoreboard locally,
- opens the control console,
- runs a local relay at `ws://127.0.0.1:9011`,
- loads `display.html` and `output.html` in transparent offscreen windows,
- emits NDI sources with alpha for Resolume or other NDI-compatible tools.

Build installers:

```bash
cd ndi-app
npm run build
```

Build artifacts are created in `ndi-app/dist/` and are not committed.

## Outputs for OBS, Resolume and NDI

| Output | URL / Source | Purpose |
|---|---|---|
| Lower-third scoreboard | `output.html` | Transparent broadcast bar with teams, logos, clock and sponsor ticker |
| Full-screen scoreboard | `display.html` | Stadium-style scoreboard with big panels, logos, cards and clock |
| NDI Screen | `Marcador · Pantalla` | Full-screen output from the Electron app |
| NDI Bar | `Marcador · Barra` | Lower-third output from the Electron app |

In OBS, add a Browser Source. In Resolume, use a Web source or the NDI sources
created by the desktop app.

## Backgrounds and Sponsor Ticker

The full-screen display can use:

- transparent background for compositing,
- solid color,
- uploaded image,
- image gallery from [`fondos/`](fondos/),
- automatic gallery rotation.

Put background images in `fondos/`, then open the Control settings and use
`Fondo -> Galeria -> Buscar en /fondos`.

Sponsor logos are uploaded from the Control settings and rendered as a
continuous ticker in the output graphics.

## Stream Deck, Keyboard and MIDI

The simplest Stream Deck setup is a Hotkey action using the keyboard shortcuts.

| Action | Key | Action | Key |
|---|---:|---|---:|
| Home + point | `Q` | Away + point | `P` |
| Home - point | `A` | Away - point | `L` |
| Home +1/+2/+3 | `1` `2` `3` | Away +1/+2/+3 | `8` `9` `0` |
| Rugby home +2/+3 | `F` / `D` | Rugby away +2/+3 | `J` / `K` |
| Home foul | `W` | Away foul | `O` |
| Home yellow/red | `E` / `R` | Away yellow/red | `I` / `U` |
| Serve home/away | `[` / `]` | Clock play/pause | `Space` |
| Clock reset | `C` | Period +/- | `N` / `B` |
| Added time +/- | `+` / `-` | Show/hide graphic | `V` |
| Undo | `Z` | Swap sides | `S` |
| Save | `G` | Reset match | `Backspace` |

Advanced Stream Deck WebSocket bridge:

```bash
node bridge.js
```

Connect the Control to `ws://localhost:9000`, then send web requests:

```text
http://localhost:9000/cmd/a_plus
http://localhost:9000/cmd/b_plus
http://localhost:9000/cmd/clock_toggle
```

Command IDs:

```text
a_plus a_minus b_plus b_minus a1 a2 a3 b1 b2 b3
a_conv a_pen b_conv b_pen
a_foul b_foul a_yellow a_red b_yellow b_red
serve_a serve_b clock_toggle clock_reset period_next period_prev
added_plus added_minus onair undo swap save reset
```

## Project Structure

| Path | Responsibility |
|---|---|
| `engine.js` | Sports rules, clock, match state, persistence and sync |
| `control.js` | Operator console, commands, keyboard, MIDI, WebSocket, backgrounds, sponsors and history |
| `scoreboard.js` | HTML rendering for lower-third, full-screen display and sponsors |
| `scoreboard.css` | Broadcast output styling |
| `index.html` / `style.css` | Control console UI |
| `output.html` / `output.js` | Lower-third scoreboard output |
| `display.html` / `display.js` | Full-screen stadium scoreboard output |
| `bridge.js` | Stream Deck HTTP-to-WebSocket bridge |
| `fondos/` | Background gallery images |
| `logos/` | Brand and sample team logos |
| `ndi-app/` | Electron desktop app and NDI output source |

## Development

The web app has no build step. Quick syntax check:

```bash
node --check engine.js
node --check scoreboard.js
node --check control.js
node --check output.js
node --check display.js
node --check bridge.js
node --check ndi-app/main.js
```

Ignored generated files:

- `node_modules/`
- `ndi-app/dist/`
- `ndi-app/build/`
- installer files: `.dmg`, `.exe`, `.msi`, `.AppImage`, `.deb`, `.rpm`, `.pkg`
- packaged bundles: `.asar`, `.blockmap`

## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup,
coding conventions and the kind of issues that are most useful.

## License

Copyright 2026 RGB LED GROUP S.L.

This project is licensed under the Apache License, Version 2.0. See
[`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

The Apache License does not grant permission to use the EsportLed or LedLemon
names, logos or trademarks except as required to describe the origin of the
software.

---

**EsportLed** · open-source sports LED scoreboard software for OBS, Resolume and
NDI · a **LedLemon** project.
