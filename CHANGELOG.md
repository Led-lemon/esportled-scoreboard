# Changelog

## 1.5.3

### Fixed — desktop app froze on Windows

Opening an output window ("Abrir salida" / "Abrir lite") could lock up the whole
app: the windows stopped repainting and could no longer be dragged. Clicking the
title bar to move one made it unrecoverable, because Windows blocks the app's
message pump while a window is being moved. Three compounding causes:

- **libuv thread pool starvation.** NDI frames are sent through
  `napi_create_async_work`, so each send runs on the libuv thread pool, and with
  `clockVideo: true` the native call blocks until the frame's presentation time.
  Three outputs kept three of the four default threads parked permanently, and
  the built-in static server (`fs.readFile`) was left fighting for the last one.
  `UV_THREADPOOL_SIZE` is now set to CPU count + 4 (minimum 8) before any module
  that uses the pool is loaded.
- **Output windows shared the Control's renderer process.** They were opened via
  the `window.open` path, which keeps them linked to the opener, so Chromium put
  them in the same process: repainting a 1080p output froze the console and vice
  versa. They are now created by the main process without an opener, so each one
  gets its own renderer. Sync is unaffected — it goes over the WebSocket relay.
  Windows are still reused by name: clicking the button again focuses the
  existing window instead of opening a duplicate.
- **Wasted work on the main thread.** The `paint` handler copied the frame
  (~8 MB at 1080p) and un-premultiplied it (a JS loop over 2 M pixels) on every
  repaint, sent or not. Frames are now dropped before the copy when the previous
  one has not been consumed, and un-premultiplied only when actually sent.

### Changed

- Default output frame rate is now 30 fps. A scoreboard does not change every
  frame, and each 1080p output is roughly 250 MB/s over NDI.
- `config.json` is now read from the user data folder and from next to the
  executable before falling back to the copy bundled inside the app. Previously
  it only lived inside `app.asar`, so frame rate and outputs could not be
  adjusted on a slower machine without rebuilding.
- The clock is always white, in all three outputs. It no longer turns red while
  running or dark red once time is up.

### Changed — Ultra Lite output

- Score digits now fill the full window height minus 2 px top and bottom
  (124 px of ink in a 128 px window). Sizing is derived from measured Bebas Neue
  metrics: a digit is 0.72 em of ink and the baseline sits 0.80 em from the top
  of the line box. The colour box overflows and is clipped on purpose — the
  digit is what matters. Width adapts to the number of digits, so a 3-digit
  basketball score shrinks to fit its cell instead of overlapping the centre.
- Yellow and red cards are shown flush against the window edges, yellows above
  reds, one square per card. They are always the same size, five fit vertically
  in a 128 px window, and a sixth wraps into a second column. The column only
  exists when there are cards, so an empty scoreboard keeps full-height digits.
  Only shown for sports with cards enabled (`feat.cards`).

## 1.0.0

- Public GitHub-ready source release.
- Web scoreboard for OBS and Resolume.
- Electron desktop app with NDI output support.
- Sports support for football, basketball, volleyball, tennis, padel and rugby.
- Sponsor ticker, custom backgrounds, match history and external controls.
