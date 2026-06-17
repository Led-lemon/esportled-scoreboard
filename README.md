# EsportLed Scoreboard

A professional, broadcast-ready sports scoreboard — part of the **EsportLed** ecosystem, the
LED scoreboard and display solution for stadiums, arenas and sporting events built by **LedLemon**.

EsportLed manufactures and integrates large-format LED screens; this software is the on-screen
scoreboard that drives them: a **free**, lightweight web app (JavaScript + CSS, no frameworks, no
dependencies) with the brand's own look, ready for live production.

It is **completely free** to use and supports
**Football ⚽ · Basketball 🏀 · Volleyball 🏐 · Tennis 🎾 · Padel 🏓**
with a **control + outputs** architecture (TV-production style):

- **Control** (`index.html`) — the operator's console.
- **Outputs** — two transparent-background graphics, designed as **inputs** for Resolume / OBS:
  - `output.html` — lower-third bar.
  - `display.html` — full-screen, stadium-style scoreboard.

Everything stays in sync with the Control in real time (same browser / tabs).

> Note: the scoreboard interface (operator console and on-screen graphics) is in **Spanish**.
> This documentation is in English; on-screen menu labels below are quoted as they appear in the app.

## How to run

Serve it over `localhost` (required for ES modules and MIDI):

```bash
cd esportled-scoreboard
python3 -m http.server 8080
```

- Control: <http://localhost:8080/index.html>
- The Control **Preview** shows the **full-screen display** (main mode) and **🖥️ Abrir salida**
  opens it in a window. The lower-third bar is opened from **⚙️ → Salidas**.

## Control screen

- **Live preview** of what the output shows.
- **Teams**: name, abbreviation, **color** (or **transparent**, so the panel lets the background
  show through) and a custom **logo** (upload an image).
- **Clock** with periods/quarters and, in football, **added time** (+1', +2'…).
- Large per-sport score controls (goals, +1/+2/+3, fouls, cards, serve, possession…).
- **Show / hide the graphic** on the output with an animation (key `V` or external control).
- Undo, swap sides, save, reset, history.
- Each sport remembers its own match.

## Outputs for Resolume / OBS (one server, two inputs, one output)

A single server (`http.server`) serves the pages. In **Resolume**, add each URL as a **Web**
source (in OBS: *Source → Browser*); all of them have a **transparent background**, so Resolume
composites them over the match video and sends a single output to a screen/projector.

| Input | URL | What it shows |
|---|---|---|
| Lower-third bar | `output.html` | *Lower-third* with logos, colors, clock and added time. |
| Full-screen display | `display.html` | Stadium-style scoreboard: names, color panels, logos, clock and cards. |

- To view them standalone on a monitor with a background, add `?bg=solid` (e.g. `display.html?bg=solid`).
- **Custom background** for the full-screen display: under **⚙️ → Fondo personalizado** you can pick a
  color, upload an image, or use the **gallery from the `fondos/` folder** (press *Buscar en /fondos*):
  pick a photo by thumbnail or enable **Auto** to cycle through them every N seconds. Open the display
  with `display.html?bg=custom`. Priority: gallery › image › color.
- From the Control: **⚙️ → Salidas (Resolume / OBS)** has buttons to open each one.

## Per-sport rules

- **Football**: goals, fouls, 🟨🟥, 2 halves + extra time, count-up clock and **added time**.
- **Basketball**: +1/+2/+3, fouls, possession, 4 quarters + overtime, count-down clock.
- **Volleyball**: points per set, sets, automatic serve (side-out), best of 3/5.
- **Tennis**: 0/15/30/40/AD, deuce, games, sets, tie-break, best of 1/3/5.
- **Padel**: like tennis + **golden point**.

Configurable under **⚙️ Reglas y control externo**.

## Keyboard / Stream Deck control

The Control shortcuts are the direct path for Stream Deck (action **System → Hotkey**).

| Action | Key | Action | Key |
|---|---|---|---|
| Home +point | `Q` | Away +point | `P` |
| Home −point | `A` | Away −point | `L` |
| Home +1/+2/+3 | `1` `2` `3` | Away +1/+2/+3 | `8` `9` `0` |
| Home foul | `W` | Away foul | `O` |
| Home 🟨 / 🟥 | `E` / `R` | Away 🟨 / 🟥 | `I` / `U` |
| Serve home / away | `[` / `]` | Clock play/pause | `Space` |
| Clock reset | `C` | Period + / − | `N` / `B` |
| Added time + / − | `+` / `-` | Show/hide graphic | `V` |
| Undo | `Z` | Swap sides | `S` |
| Save | `G` | Reset | `Backspace` |

### Stream Deck — advanced option (WebSocket, no window focus needed)
1. `node bridge.js`
2. Control → ⚙️ → **Stream Deck (WebSocket)** → `ws://localhost:9000` → Connect.
3. In Stream Deck, with a web-request plugin, create buttons that send a **GET** to
   `http://localhost:9000/cmd/<command>` (e.g. `/cmd/a_plus`, `/cmd/clock_toggle`).

## MIDI

Control → ⚙️ → **Activar MIDI** → **Aprender** next to an action → press a pad/key/fader.
It gets bound (Chrome/Edge).

## Command IDs (WebSocket / MIDI)

`a_plus a_minus b_plus b_minus a1 a2 a3 b1 b2 b3 a_foul b_foul a_yellow a_red b_yellow b_red`
`serve_a serve_b clock_toggle clock_reset period_next period_prev added_plus added_minus`
`onair undo swap save reset`

## Files

| File | What it is |
|---|---|
| `index.html` · `control.js` · `style.css` | Control console |
| `output.html` · `output.js` | Lower-third bar output |
| `display.html` · `display.js` | Full-screen display output (stadium-style scoreboard) |
| `fondos/` | Folder of background photos for the full-screen display gallery |
| `scoreboard.js` · `scoreboard.css` | Broadcast graphics: bar + full-screen displays (shared) |
| `engine.js` | Sports logic, clock and synchronization |
| `bridge.js` | Optional WebSocket bridge for Stream Deck (Node) |

---

**EsportLed** · Free LED scoreboards & displays for sport · a **LedLemon** project.
