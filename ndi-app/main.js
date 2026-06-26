/* ============================================================
   MARCADOR · App de escritorio (Control + salida NDI con alfa)
   ------------------------------------------------------------
   Un solo ejecutable. Al abrirlo:
     1. Sirve el proyecto por HTTP local (los módulos ES no van por file://).
     2. Abre la CONSOLA DE CONTROL como ventana principal (index.html).
     3. Abre un relay WebSocket por si quieres controlar desde otro navegador.
     4. Por cada salida en config.outputs carga la página (display.html /
        output.html) en una ventana offscreen + transparente.
     5. Captura cada frame (BGRA con alfa) y emite UNA fuente NDI por salida.
   Control y salidas comparten origen, así que se sincronizan solas
   (publish()/BroadcastChannel/localStorage). La transparencia viaja en NDI:
   en Resolume pones cada fuente en una capa por encima de tu fondo. Sin OBS.
   ============================================================ */
const { app, BrowserWindow, Menu, shell } = require("electron");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { WebSocketServer } = require("ws");
const grandiose = require("@stagetimerio/grandiose");

/* ---------- Config ---------- */
const DEFAULTS = {
  outputs: [
    { page: "display.html", name: "Marcador · Pantalla", width: 1920, height: 1080, fps: 60 },
    { page: "output.html", name: "Marcador · Barra", width: 1920, height: 1080, fps: 60 },
  ],
  httpPort: 8099, wsPort: 9011, unpremultiply: true,
};
function loadConfig() {
  let user = {};
  // En empaquetado, config.json viaja junto al código de la app.
  try { user = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")); } catch {}
  const cfg = { ...DEFAULTS, ...user };
  if (!Array.isArray(cfg.outputs) || !cfg.outputs.length) {
    cfg.outputs = [{
      page: user.page || "display.html", name: user.name || "Marcador NDI",
      width: user.width || 1920, height: user.height || 1080, fps: user.fps || 60,
    }];
  }
  return cfg;
}
const CFG = loadConfig();

// Raíz de los archivos web (engine.js, *.html, css, logos):
//  - dev: el repo está un nivel por encima de ndi-app/
//  - empaquetado: electron-builder copia el repo a resources/web (ver package.json)
const ROOT = app.isPackaged ? path.join(process.resourcesPath, "web") : path.resolve(__dirname, "..");

const FOURCC_BGRA = grandiose.FOURCC_BGRA ?? 1095911234;        // 'BGRA'
const FMT_PROGRESSIVE = grandiose.FORMAT_TYPE_PROGRESSIVE ?? 1; // FrameType.Progressive

/* ---------- 1) Servidor estático (raíz del proyecto) ---------- */
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon",
};
function startStatic(port) {
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent((req.url || "/").split("?")[0]);
      if (p === "/") p = "/index.html";
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end("not found"); }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
        res.end(data);
      });
    } catch { res.writeHead(500); res.end("error"); }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

/* ---------- 3) Hub WebSocket (sincroniza Control <-> salidas) ----------
   El Control empuja el estado; TODAS las salidas (offscreen para NDI, ventanas
   emergentes "Abrir salida", o incluso otro navegador) lo reciben por aquí.
   Entre ventanas de Electron localStorage/BroadcastChannel no propaga fiable,
   así que este hub es la vía única. Cachea el último estado para dar un
   snapshot a quien se conecte después. */
const outputs = []; // [{ cfg, win, latest, sender, running, warned }]
const clients = new Set();
const lastPayloads = new Map();
function startRelay(port) {
  const wss = new WebSocketServer({ host: "127.0.0.1", port });
  wss.on("connection", (sock) => {
    clients.add(sock);
    for (const p of lastPayloads.values()) { try { sock.send(JSON.stringify(p)); } catch {} }
    sock.on("message", (buf) => {
      const text = buf.toString();
      let p; try { p = JSON.parse(text); } catch { return; }
      if (!p || !p.type) return;
      lastPayloads.set(p.type, p);
      for (const c of clients) { if (c !== sock && c.readyState === 1) { try { c.send(text); } catch {} } }
    });
    sock.on("close", () => clients.delete(sock));
  });
  wss.on("error", (e) => console.error("[relay] error:", e.message));
  return wss;
}

/* ---------- 2) Ventana principal: Consola de Control ---------- */
let controlWin = null;
function createControlWindow() {
  controlWin = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 620,
    title: "Marcador · Control",
    backgroundColor: "#0b0e14",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  controlWin.loadURL(`http://127.0.0.1:${CFG.httpPort}/index.html`);
  // "Abrir salida" (display.html/output.html) debe abrirse DENTRO de la app, mismo
  // origen, para que se sincronice con el Control. Solo los enlaces realmente
  // externos van al navegador del sistema.
  controlWin.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.hostname === "127.0.0.1" && String(u.port) === String(CFG.httpPort)) {
        return { action: "allow" }; // ventana Electron normal (misma sesión/origen)
      }
    } catch {}
    shell.openExternal(url);
    return { action: "deny" };
  });
  controlWin.on("closed", () => { controlWin = null; app.quit(); });
}

/* ---------- 4+5) Una salida = ventana offscreen + emisor NDI ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Electron entrega alfa premultiplicado; NDI BGRA espera alfa recto.
// Solo divide en píxeles de borde (0<alfa<255); opacos/transparentes se saltan.
function unpremultiply(buf) {
  for (let i = 0; i < buf.length; i += 4) {
    const a = buf[i + 3];
    if (a === 0 || a === 255) continue;
    const inv = 255 / a;
    const b = buf[i] * inv, g = buf[i + 1] * inv, r = buf[i + 2] * inv;
    buf[i] = b > 255 ? 255 : b;
    buf[i + 1] = g > 255 ? 255 : g;
    buf[i + 2] = r > 255 ? 255 : r;
  }
}

function createOutput(oc) {
  const o = { cfg: oc, win: null, latest: null, sender: null, running: false, warned: false };
  o.win = new BrowserWindow({
    width: oc.width, height: oc.height,
    show: false, frame: false, transparent: true, backgroundColor: "#00000000",
    webPreferences: { offscreen: true, backgroundThrottling: false },
  });
  o.win.webContents.setFrameRate(oc.fps);
  o.win.webContents.on("paint", (_e, _dirty, image) => {
    const size = image.getSize();
    const data = image.toBitmap(); // BGRA, copia propia
    if (CFG.unpremultiply) unpremultiply(data);
    o.latest = { data, width: size.width, height: size.height };
  });
  // La página se sincroniza sola conectándose al hub (connectRemoteReceiver).
  o.win.loadURL(`http://127.0.0.1:${CFG.httpPort}/${oc.page}`);
  outputs.push(o);
  return o;
}

async function ndiLoop(o) {
  while (o.running) {
    if (!o.sender || !o.latest) { await sleep(20); continue; }
    const f = o.latest;
    try {
      await o.sender.video({
        xres: f.width, yres: f.height,
        frameRateN: o.cfg.fps * 1000, frameRateD: 1000,
        fourCC: FOURCC_BGRA,
        pictureAspectRatio: f.width / f.height,
        frameFormatType: FMT_PROGRESSIVE,
        lineStrideBytes: f.width * 4,
        data: f.data,
      });
    } catch (e) {
      if (!o.warned) { o.warned = true; console.error(`[ndi:${o.cfg.name}] envío de frame falló:`, e.message); }
      await sleep(50);
    }
  }
}

/* ---------- Arranque ---------- */
// Instancia única: si ya está abierta, enfoca la existente.
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on("second-instance", () => { if (controlWin) { if (controlWin.isMinimized()) controlWin.restore(); controlWin.focus(); } });

app.whenReady().then(async () => {
  await startStatic(CFG.httpPort);
  console.log(`[http] sirviendo ${ROOT} en http://127.0.0.1:${CFG.httpPort}`);
  startRelay(CFG.wsPort);
  console.log(`[relay] escuchando ws://127.0.0.1:${CFG.wsPort}`);

  createControlWindow();

  for (const oc of CFG.outputs) {
    const o = createOutput(oc);
    try {
      o.sender = await grandiose.send({ name: oc.name, clockVideo: true, clockAudio: false });
      console.log(`[ndi] emitiendo: "${oc.name}" (${oc.width}x${oc.height} @ ${oc.fps}) · ${oc.page}`);
    } catch (e) {
      console.error(`[ndi] no se pudo iniciar "${oc.name}":`, e.message);
    }
    o.running = true;
    ndiLoop(o);
  }
});

app.on("window-all-closed", () => app.quit());

// Apagado ordenado. El módulo NDI es nativo: si se destruye el emisor mientras
// un sender.video() está en vuelo (o la ventana offscreen sigue pintando), el
// proceso casca ("Electron se ha cerrado inesperadamente"). Por eso paramos los
// bucles, cerramos la captura, esperamos a que terminen los envíos y solo
// entonces destruimos los emisores y salimos.
let quitting = false;
app.on("before-quit", (e) => {
  // Mientras apagamos, cancela SIEMPRE el quit por defecto (p. ej. el que
  // dispara window-all-closed al cerrar las offscreen): salimos solo con
  // app.exit(0) al final de shutdown(), ya con los emisores NDI destruidos.
  e.preventDefault();
  if (quitting) return;
  quitting = true;
  shutdown();
});
async function shutdown() {
  for (const o of outputs) o.running = false;                 // 1) parar bucles de envío
  for (const o of outputs) {                                  // 2) parar captura (cerrar offscreen)
    try { if (o.win && !o.win.isDestroyed()) o.win.destroy(); } catch {}
  }
  await new Promise((r) => setTimeout(r, 150));               // 3) dejar terminar video() en vuelo
  for (const o of outputs) {                                  // 4) destruir emisores NDI
    try { if (o.sender) await o.sender.destroy(); } catch {}
    o.sender = null;
  }
  app.exit(0);                                                // 5) salir limpio
}
