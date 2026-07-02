/* ============================================================
   CONTROL · consola del operador
   ============================================================ */
import * as E from "./engine.js";
// El Preview es un <iframe> a display.html (modo básico) que se sincroniza solo.

const $ = (id) => document.getElementById(id);
const HISTORY_KEY = "mm_history";

let match = E.loadMatch() || E.createMatch("futbol");
if (!E.SPORTS[match.sport]) match = E.createMatch("futbol");
let undoStack = [];

/* ---------- Cambios + sincronización ---------- */
function apply(mutator, undoable = true) {
  if (undoable) { undoStack.push(E.cloneMatch(match)); if (undoStack.length > 80) undoStack.shift(); }
  mutator(match);
  sync();
}
function sync() { E.publish(match); render(); }
function undo() {
  if (!undoStack.length) { toast("Nada que deshacer"); return; }
  match = undoStack.pop(); sync();
}

/* ============================================================
   COMANDOS (teclado · MIDI · Stream Deck)
   ============================================================ */
const c = () => E.resolveCfg(match.sport);
const COMMANDS = {
  a_plus: () => apply((m) => E.primaryScore(m, "A")),
  b_plus: () => apply((m) => E.primaryScore(m, "B")),
  a_minus: () => smartMinus("A"),
  b_minus: () => smartMinus("B"),
  a1: () => match.sport === "basquet" && apply((m) => E.addCount(m, "A", 1)),
  a2: () => match.sport === "basquet" && apply((m) => E.addCount(m, "A", 2)),
  a3: () => match.sport === "basquet" && apply((m) => E.addCount(m, "A", 3)),
  b1: () => match.sport === "basquet" && apply((m) => E.addCount(m, "B", 1)),
  b2: () => match.sport === "basquet" && apply((m) => E.addCount(m, "B", 2)),
  b3: () => match.sport === "basquet" && apply((m) => E.addCount(m, "B", 3)),
  a_conv: () => match.sport === "rugby" && apply((m) => E.addCount(m, "A", 2)), // transformación
  b_conv: () => match.sport === "rugby" && apply((m) => E.addCount(m, "B", 2)),
  a_pen: () => match.sport === "rugby" && apply((m) => E.addCount(m, "A", 3)),  // penal / drop
  b_pen: () => match.sport === "rugby" && apply((m) => E.addCount(m, "B", 3)),
  a_foul: () => c().feat.fouls && apply((m) => E.addStat(m, "A", "fouls", 1)),
  b_foul: () => c().feat.fouls && apply((m) => E.addStat(m, "B", "fouls", 1)),
  a_yellow: () => c().feat.cards && apply((m) => E.addStat(m, "A", "yellow", 1)),
  b_yellow: () => c().feat.cards && apply((m) => E.addStat(m, "B", "yellow", 1)),
  a_red: () => c().feat.cards && apply((m) => E.addStat(m, "A", "red", 1)),
  b_red: () => c().feat.cards && apply((m) => E.addStat(m, "B", "red", 1)),
  serve_a: () => apply((m) => E.setServe(m, "A"), false),
  serve_b: () => apply((m) => E.setServe(m, "B"), false),
  clock_toggle: () => apply((m) => E.toggleClock(m), false),
  clock_reset: () => apply((m) => E.resetClock(m), false),
  period_next: () => apply((m) => E.changePeriod(m, 1), false),
  period_prev: () => apply((m) => E.changePeriod(m, -1), false),
  added_plus: () => apply((m) => E.addAdded(m, 1), false),
  added_minus: () => apply((m) => E.addAdded(m, -1), false),
  undo: () => undo(),
  swap: () => apply((m) => E.swapSides(m)),
  save: () => saveMatch(),
  reset: () => resetMatch(),
  onair: () => apply((m) => (m.onAir = !m.onAir), false),
};
function smartMinus(who) {
  const cf = c();
  if (cf.scoring === "count" || cf.scoring === "basket" || cf.scoring === "rugby") apply((m) => E.addCount(m, who, -1));
  else if (cf.scoring === "set") apply((m) => E.volleyPoint(m, who, -1));
  else undo();
}
function runCommand(id) { const f = COMMANDS[id]; if (f) f(); }

const COMMAND_LIST = [
  ["a_plus", "Local: + punto", "Q"], ["a_minus", "Local: − punto", "A"],
  ["b_plus", "Visitante: + punto", "P"], ["b_minus", "Visitante: − punto", "L"],
  ["a1", "Local +1 (básquet)", "1"], ["a2", "Local +2", "2"], ["a3", "Local +3", "3"],
  ["b1", "Visitante +1", "8"], ["b2", "Visitante +2", "9"], ["b3", "Visitante +3", "0"],
  ["a_conv", "Local +2 (rugby transf.)", "F"], ["a_pen", "Local +3 (rugby penal/drop)", "D"],
  ["b_conv", "Visitante +2 (rugby)", "J"], ["b_pen", "Visitante +3 (rugby)", "K"],
  ["a_foul", "Local: falta", "W"], ["b_foul", "Visitante: falta", "O"],
  ["a_yellow", "Local 🟨", "E"], ["a_red", "Local 🟥", "R"],
  ["b_yellow", "Visitante 🟨", "I"], ["b_red", "Visitante 🟥", "U"],
  ["serve_a", "Saque local", "["], ["serve_b", "Saque visitante", "]"],
  ["clock_toggle", "Reloj play/pausa", "Espacio"], ["clock_reset", "Reloj reset", "C"],
  ["period_next", "Periodo +", "N"], ["period_prev", "Periodo −", "B"],
  ["added_plus", "Tiempo añadido +", "+"], ["added_minus", "Tiempo añadido −", "-"],
  ["onair", "Mostrar/ocultar gráfico", "V"], ["undo", "Deshacer", "Z"],
  ["swap", "Cambiar lados", "S"], ["save", "Guardar", "G"], ["reset", "Reiniciar", "Backspace"],
];
const KEYMAP = {};
COMMAND_LIST.forEach(([id, , key]) => {
  const k = key === "Espacio" ? " " : key === "Backspace" ? "backspace" : key.toLowerCase();
  KEYMAP[k] = id;
});
function handleKey(e) {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  const k = e.key === " " ? " " : e.key.toLowerCase();
  const cmd = KEYMAP[k];
  if (!cmd) return;
  e.preventDefault();
  runCommand(cmd);
}

/* ---------- MIDI ---------- */
let midiAccess = null, midiLearnTarget = null;
function midiKey(d) {
  const st = d[0] & 0xf0;
  if (st === 0x90 && d[2] > 0) return "n" + d[1];
  if (st === 0xb0 && d[2] > 0) return "c" + d[1];
  return null;
}
const midiBindings = () => { try { return JSON.parse(localStorage.getItem("mm_midi") || "{}"); } catch { return {}; } };
function setMidiBinding(key, cmd) {
  const b = midiBindings();
  for (const k in b) if (b[k] === cmd) delete b[k];
  if (key) b[key] = cmd;
  localStorage.setItem("mm_midi", JSON.stringify(b));
}
function onMidiMessage(ev) {
  const key = midiKey(ev.data);
  if (!key) return;
  if (midiLearnTarget) {
    setMidiBinding(key, midiLearnTarget); midiLearnTarget = null; toast("MIDI asignado");
    if (!$("settingsModal").hidden) openSettings(); return;
  }
  const cmd = midiBindings()[key];
  if (cmd) runCommand(cmd);
}
async function enableMidi() {
  if (!navigator.requestMIDIAccess) { toast("Navegador sin soporte MIDI"); return; }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    bindMidi(); midiAccess.onstatechange = bindMidi;
    localStorage.setItem("mm_midi_on", "1"); toast("🎹 MIDI activado");
    if (!$("settingsModal").hidden) openSettings();
  } catch { toast("No se pudo activar MIDI"); }
}
function bindMidi() { if (midiAccess) midiAccess.inputs.forEach((i) => (i.onmidimessage = onMidiMessage)); }
function midiInputNames() { return midiAccess ? Array.from(midiAccess.inputs.values()).map((i) => i.name) : []; }

/* ---------- WebSocket (Stream Deck avanzado) ---------- */
let ws = null;
function connectWs(url) {
  disconnectWs(); if (!url) return;
  try {
    ws = new WebSocket(url);
    ws.onopen = () => toast("🔌 Stream Deck conectado");
    ws.onclose = () => (ws = null);
    ws.onerror = () => toast("Error WebSocket");
    ws.onmessage = (m) => {
      let cmd = String(m.data).trim();
      try { const j = JSON.parse(m.data); cmd = j.cmd || j.command || cmd; } catch {}
      if (COMMANDS[cmd]) runCommand(cmd);
    };
    localStorage.setItem("mm_ws", url);
  } catch { toast("URL inválida"); }
}
function disconnectWs() { if (ws) { try { ws.close(); } catch {} ws = null; } }

/* ---------- Sync hacia la app NDI (relay WS local, opcional) ----------
   Empuja el estado completo a la app Electron→NDI si está abierta (otro
   navegador, no comparte localStorage). Silencioso: si el relay no existe,
   reintenta sin molestar. No afecta al uso normal si nunca se abre la app. */
let ndiWs = null, ndiTimer = null;
function ndiSend(payload) { try { if (ndiWs && ndiWs.readyState === 1) ndiWs.send(JSON.stringify(payload)); } catch {} }
function connectNdi() {
  try {
    ndiWs = new WebSocket("ws://127.0.0.1:9011");
    ndiWs.onopen = () => {
      E.setRemoteSync(ndiSend);
      // snapshot inicial: la salida NDI toma el estado actual al conectar
      ndiSend({ type: "state", data: match });
      ndiSend({ type: "bg", data: E.loadBg() || {} });
      ndiSend({ type: "sponsors", data: E.loadSponsors() || {} });
    };
    ndiWs.onclose = () => { ndiWs = null; E.setRemoteSync(null); };
    ndiWs.onerror = () => { try { ndiWs.close(); } catch {} };
  } catch {}
}
function startNdiSync() {
  connectNdi();
  if (!ndiTimer) ndiTimer = setInterval(() => { if (!ndiWs) connectNdi(); }, 8000);
}

/* ============================================================
   ACCIONES
   ============================================================ */
function loadSport(sport) {
  if (sport === match.sport) return;
  // guarda el partido actual del deporte y carga/crea el del nuevo
  localStorage.setItem("mm_saved_" + match.sport, JSON.stringify(match));
  let next = null;
  try { next = JSON.parse(localStorage.getItem("mm_saved_" + sport) || "null"); } catch {}
  match = next && E.SPORTS[next.sport] ? next : E.createMatch(sport);
  undoStack = []; sync();
}
function resetMatch() {
  if (!confirm("¿Reiniciar el partido? Se mantienen equipos, colores y logos.")) return;
  const keep = E.cloneMatch(match);
  match = E.createMatch(match.sport);
  ["name", "short", "color", "logo"].forEach((k) => { match.A[k] = keep.A[k]; match.B[k] = keep.B[k]; });
  undoStack = []; sync(); toast("Partido reiniciado");
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
// Escribe la lista de partidos guardados. Como cada uno lleva el partido COMPLETO
// (con logos en dataURL, que pesan), si se supera el cupo de localStorage se
// descartan los más antiguos (al final) hasta que quepa. Devuelve lo realmente
// guardado, para avisar si se recortó.
function saveHistory(hist) {
  let list = hist.slice(0, 50);
  while (list.length) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); return list; }
    catch { list = list.slice(0, list.length - 1); }
  }
  try { localStorage.setItem(HISTORY_KEY, "[]"); } catch {}
  return [];
}
function saveMatch() {
  const cf = c();
  const entry = {
    id: "m" + Date.now() + "_" + Math.floor(Math.random() * 1e4),
    sport: cf.name, icon: cf.icon, date: Date.now(),
    a: match.A.name, b: match.B.name,
    scoreA: summary("A"), scoreB: summary("B"), winner: match.finished,
    match: E.cloneMatch(match), // partido completo: equipos, colores, logos, marcador, reloj, sets…
  };
  const hist = loadHistory();
  hist.unshift(entry);
  const saved = saveHistory(hist);
  toast(saved.length < hist.length ? "💾 Guardado (espacio justo: borrados los más antiguos)" : "💾 Guardado");
}
function loadSavedMatch(id) {
  const entry = loadHistory().find((h) => h.id === id);
  if (!entry || !entry.match || !E.SPORTS[entry.match.sport]) { toast("No se puede recargar este partido"); return; }
  match = E.cloneMatch(entry.match);
  undoStack = [];
  sync();
  $("historyModal").hidden = true;
  toast("↩️ Partido recargado");
}
function deleteSavedMatch(id) {
  saveHistory(loadHistory().filter((h) => h.id !== id));
  openHistory();
}
function summary(who) {
  const cf = c();
  return (cf.scoring === "set" || cf.scoring === "tennis") ? String(match[who].sets) : String(match[who].score);
}
function openOutput() { window.open("display.html?bg=custom", "mm_display", "width=1280,height=720"); }

/* ---------- Logos ---------- */
function handleLogo(who, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // El display muestra el logo hasta ~460px; 640 da nitidez de sobra sin inflar localStorage.
      const max = 640, scale = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      const ctx = cv.getContext("2d");
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      apply((m) => (m[who].logo = cv.toDataURL("image/png")), false);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function handleBgImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Fondo a pantalla completa: JPEG para no inflar localStorage (sin transparencia).
      const max = 1600, scale = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      const ctx = cv.getContext("2d");
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const b = E.loadBg() || {};
      b.image = cv.toDataURL("image/jpeg", 0.82);
      b.mode = "image"; b.enabled = true; // elegir un fondo lo activa (si no, quedaba transparente)
      E.saveBg(b); toast("🎨 Fondo cargado"); openSettings();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Sponsors (carrusel publicitario) ---------- */
function sponsorsState() {
  const s = Object.assign({ enabled: true, speed: 120, logos: [] }, E.loadSponsors() || {});
  // Migración: valores antiguos eran "segundos por vuelta" (4–180); ahora es px/s.
  if (!s.speed || s.speed < 20) s.speed = 120;
  return s;
}
function handleSponsorLogos(files) {
  const list = [...(files || [])].filter((f) => f && f.type.startsWith("image/"));
  if (!list.length) return;
  let pending = list.length;
  const s = sponsorsState();
  list.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // PNG para conservar transparencia; máx 360px de alto basta para la banda.
        const max = 360, scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
        const ctx = cv.getContext("2d");
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        s.logos.push(cv.toDataURL("image/png"));
        if (--pending === 0) { E.saveSponsors(s); toast(`📢 ${s.logos.length} sponsor(s)`); openSettings(); }
      };
      img.onerror = () => { if (--pending === 0) { E.saveSponsors(s); openSettings(); } };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Descubre las fotos de la carpeta fondos/. Solo guarda los NOMBRES en mm_bg;
   la pantalla las carga por URL (no se infla localStorage).
   Prueba un list.json y, si no, parsea el listado de directorio del servidor. */
const BG_DIR = "fondos/";
const IMG_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
async function scanBgFolder() {
  let files = [];
  try {
    const r = await fetch(BG_DIR + "list.json", { cache: "no-store" });
    if (r.ok) { const j = await r.json(); if (Array.isArray(j)) files = j.filter((f) => IMG_RE.test(f)); }
  } catch {}
  if (!files.length) {
    try {
      const r = await fetch(BG_DIR, { cache: "no-store" });
      if (r.ok) {
        const doc = new DOMParser().parseFromString(await r.text(), "text/html");
        files = [...doc.querySelectorAll("a")].map((a) => a.getAttribute("href")).filter((h) => h && IMG_RE.test(h));
      }
    } catch {}
  }
  if (!files.length) { toast("Sin fotos en /fondos"); return; }
  const b = E.loadBg() || {};
  b.gallery = Object.assign({ enabled: true, auto: false, intervalSec: 8, index: 0 }, b.gallery, { dir: BG_DIR, files });
  b.gallery.enabled = true; b.mode = "gallery"; b.enabled = true;
  E.saveBg(b); toast(`📁 ${files.length} foto(s)`); openSettings();
}
// Elige la fuente de fondo activa (color / imagen / galería). El display respeta bg.mode.
function setBgMode(mode) {
  const b = E.loadBg() || {};
  b.mode = mode; b.enabled = true; // elegir una fuente de fondo lo activa
  if (b.gallery) b.gallery.enabled = (mode === "gallery");
  E.saveBg(b); openSettings();
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  document.documentElement.style.setProperty("--ca", match.A.color);
  document.documentElement.style.setProperty("--cb", match.B.color);
  renderTabs();
  renderTeams();
  renderClock();
  renderScoreControls();
  renderOnAir();
  $("previewState").textContent = match.onAir ? "" : "(oculto)";
}

function renderTabs() {
  const nav = $("sportTabs"); nav.innerHTML = "";
  for (const key in E.SPORTS) {
    const b = document.createElement("button");
    b.className = "sport-tab" + (key === match.sport ? " active" : "");
    b.innerHTML = `<span>${E.SPORTS[key].icon}</span> ${E.SPORTS[key].name}`;
    b.onclick = () => loadSport(key);
    nav.appendChild(b);
  }
}

function renderTeams() {
  const wrap = $("teamsSetup");
  wrap.innerHTML = ["A", "B"].map((w) => {
    const t = match[w];
    const label = w === "A" ? "LOCAL" : "VISITANTE";
    const isT = t.color === "transparent";
    const hexVal = E.esc(isT ? (t.colorHex || (w === "A" ? "#2563eb" : "#dc2626")) : t.color);
    const logo = t.logo
      ? `<img class="logo-prev" src="${t.logo}" alt="">`
      : `<div class="logo-prev empty" style="background:${E.esc(t.color)}">${E.esc(E.initials(t))}</div>`;
    return `<div class="team-card" style="--tc:${hexVal}">
      <div class="tc-head">${label}</div>
      <div class="tc-row">
        ${logo}
        <div class="tc-fields">
          <input class="tc-name" data-team="${w}" data-k="name" value="${E.esc(t.name)}" maxlength="22" placeholder="Nombre">
          <div class="tc-line">
            <input class="tc-short" data-team="${w}" data-k="short" value="${E.esc(t.short)}" maxlength="4" placeholder="ABR">
            <input type="color" class="tc-color" data-team="${w}" value="${hexVal}" title="Color del equipo" ${isT ? "disabled" : ""}>
            <label class="tc-trans" title="Color transparente"><input type="checkbox" data-team="${w}" data-trans ${isT ? "checked" : ""}> Transp.</label>
            <label class="btn small file-btn">Logo<input type="file" accept="image/*" data-logo="${w}" hidden></label>
            ${t.logo ? `<button class="btn small ghost" data-clearlogo="${w}">Quitar</button>` : ""}
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  wrap.querySelectorAll("input[data-k]").forEach((inp) => {
    inp.onchange = () => apply((m) => { m[inp.dataset.team][inp.dataset.k] = inp.value.trim() || (inp.dataset.k === "name" ? "EQUIPO" : "EQ"); }, false);
  });
  wrap.querySelectorAll(".tc-color").forEach((inp) => {
    // En vivo: mutar + publicar a las salidas SIN render(). Un render() recrearía
    // este <input> en cada movimiento y cerraría el selector de color del sistema.
    // El preview local (color de tarjeta y logo-placeholder) se actualiza a mano.
    inp.oninput = () => {
      const t = match[inp.dataset.team];
      t.color = inp.value; t.colorHex = inp.value;
      E.publish(match);
      const card = inp.closest(".team-card");
      if (card) {
        card.style.setProperty("--tc", inp.value);
        const empty = card.querySelector(".logo-prev.empty");
        if (empty) empty.style.background = inp.value;
      }
    };
  });
  wrap.querySelectorAll("[data-trans]").forEach((cb) => {
    cb.onchange = () => apply((m) => {
      const t = m[cb.dataset.team];
      if (cb.checked) { if (t.color !== "transparent") t.colorHex = t.color; t.color = "transparent"; }
      else { t.color = t.colorHex || (cb.dataset.team === "A" ? "#2563eb" : "#dc2626"); }
    }, false);
  });
  wrap.querySelectorAll("input[data-logo]").forEach((inp) => {
    inp.onchange = () => handleLogo(inp.dataset.logo, inp.files[0]);
  });
  wrap.querySelectorAll("[data-clearlogo]").forEach((b) => {
    b.onclick = () => apply((m) => (m[b.dataset.clearlogo].logo = null), false);
  });
}

function renderClock() {
  const cf = c();
  $("clockPanel").style.display = cf.clockMode === "off" ? "none" : "";
  $("periodName").textContent = E.periodLabel(match);
  $("bigClock").textContent = E.clockText(match) || "—";
  $("bigClock").className = "big-clock" + (match.clock.running ? " run" : "") + (E.clockEnded(match) ? " over" : "");
  $("addedChip").textContent = E.addedText(match);
  $("addedChip").style.display = E.addedText(match) ? "" : "none";

  const btns = $("clockButtons");
  let html = `<button class="btn big" data-cmd="clock_toggle">${match.clock.running ? "⏸ Pausar" : "▶ Iniciar"}</button>
    <button class="btn ghost" data-cmd="clock_reset">↺ Reset</button>`;
  if (cf.periods) html += `<button class="btn ghost" data-cmd="period_prev">◀</button>
    <button class="btn ghost" data-cmd="period_next">Periodo ▶</button>`;
  if (cf.feat.added) html += `<span class="sep"></span>
    <button class="btn ghost" data-cmd="added_minus">− Añadido</button>
    <button class="btn ghost" data-cmd="added_plus">+ Añadido</button>`;
  btns.innerHTML = html;
  btns.querySelectorAll("[data-cmd]").forEach((b) => (b.onclick = () => runCommand(b.dataset.cmd)));
}

function renderScoreControls() {
  const cf = c();
  ["A", "B"].forEach((w) => {
    const el = $("ctrl" + w);
    const t = match[w];
    const lw = w.toLowerCase(); // ids de COMMANDS en minúscula (a_plus, b1, …)
    const nameColor = t.color === "transparent" ? "#e2e8f0" : t.color;
    let html = `<div class="ct-name" style="color:${E.esc(nameColor)}">${E.esc(t.name)}</div>
      <div class="ct-score">${E.scoreLabel(match, w)}</div>`;
    let btns = "";
    if (cf.scoring === "count") {
      btns += pb(lw + "_plus", "+ GOL", "primary");
      btns += pb(lw + "_minus", "−", "minus");
      if (cf.feat.fouls) btns += pb(lw + "_foul", "Falta");
      if (cf.feat.cards) { btns += pb(lw + "_yellow", "🟨"); btns += pb(lw + "_red", "🟥"); }
    } else if (cf.scoring === "basket") {
      btns += pb(lw + "1", "+1"); btns += pb(lw + "2", "+2", "primary"); btns += pb(lw + "3", "+3");
      btns += pb(lw + "_minus", "−", "minus");
      if (cf.feat.fouls) btns += pb(lw + "_foul", "Falta");
      btns += `<button class="cbtn" data-poss="${w}">⟵ Posesión</button>`;
    } else if (cf.scoring === "rugby") {
      btns += pb(lw + "_plus", "+5 ENSAYO", "primary");
      btns += pb(lw + "_conv", "+2 Transf.");
      btns += pb(lw + "_pen", "+3 Penal/Drop");
      btns += pb(lw + "_minus", "−", "minus");
      if (cf.feat.cards) { btns += pb(lw + "_yellow", "🟨"); btns += pb(lw + "_red", "🟥"); }
    } else if (cf.scoring === "set") {
      btns += pb(lw + "_plus", "+ PUNTO", "primary");
      btns += pb(lw + "_minus", "−", "minus");
      btns += `<button class="cbtn" data-serve="${w}">Saque</button>`;
    } else if (cf.scoring === "tennis") {
      btns += pb(lw + "_plus", "+ PUNTO", "primary");
      btns += pb(lw + "_minus", "− (deshacer)", "minus");
      btns += `<button class="cbtn" data-serve="${w}">Saque</button>`;
    }
    el.innerHTML = html + `<div class="ct-buttons">${btns}</div>`;
    el.querySelectorAll("[data-cmd]").forEach((b) => (b.onclick = () => runCommand(b.dataset.cmd)));
    el.querySelectorAll("[data-poss]").forEach((b) => (b.onclick = () => apply((m) => E.setPossession(m, b.dataset.poss), false)));
    el.querySelectorAll("[data-serve]").forEach((b) => (b.onclick = () => apply((m) => E.setServe(m, b.dataset.serve), false)));
  });

  const center = $("ctrlCenter");
  let info = "VS";
  if (cf.feat.serving && match.serving) info = "Saque: " + match[match.serving].short;
  if (cf.feat.possession && match.possession) info = "Posesión: " + match[match.possession].short;
  center.innerHTML = `<div class="center-vs">${E.esc(info)}</div>` +
    (match.finished ? `<div class="center-final">🏆 ${E.esc(match[match.finished].name)}</div>` : "");
}
function pb(cmd, label, extra = "") { return `<button class="cbtn ${extra}" data-cmd="${cmd}">${label}</button>`; }

function renderOnAir() {
  const b = $("btnOnAir");
  if (!b) return;
  b.classList.toggle("live", match.onAir);
  b.textContent = match.onAir ? "● EN AIRE" : "○ OCULTO";
}

/* ============================================================
   SETTINGS · HISTORY · TOAST
   ============================================================ */
function openSettings() {
  const cf = c(), body = $("settingsBody");
  let html = `<h3 class="sec-title">📋 Reglas · ${cf.name}</h3>`;
  if (match.sport === "futbol") html += numRow("defMin", "Minutos por tiempo", cf.defMin, 1, 60);
  if (match.sport === "rugby") html += numRow("defMin", "Minutos por tiempo", cf.defMin, 1, 60);
  if (match.sport === "basquet") html += numRow("defMin", "Minutos por cuarto", cf.defMin, 1, 20);
  if (match.sport === "voley") {
    html += numRow("setPoints", "Puntos por set", cf.setPoints, 5, 50);
    html += numRow("lastSetPoints", "Puntos último set", cf.lastSetPoints, 5, 50);
    html += selRow("bestOf", "Sets (mejor de)", cf.bestOf, [["3", 3], ["5", 5]]);
  }
  if (match.sport === "tenis" || match.sport === "padel") {
    html += selRow("bestOf", "Sets (mejor de)", cf.bestOf, [["1", 1], ["3", 3], ["5", 5]]);
    html += `<div class="setting-row"><label>Punto de oro<span class="hint">Sin ventaja (típico de pádel)</span></label>
      <input type="checkbox" id="set-golden" ${cf.golden ? "checked" : ""}></div>`;
  }

  // Salidas (inputs para Resolume / OBS)
  html += `<h3 class="sec-title">🖥️ Salidas (Resolume / OBS)</h3>
    <p class="hint" style="margin:2px 0 10px">Fondo transparente — añade cada salida en Resolume/OBS. El fondo de la pantalla grande se enciende/apaga abajo.</p>
    <div class="setting-row"><label>Barra inferior<span class="hint">Lower-third sobre el vídeo · output.html</span></label>
      <span class="switch"><button class="btn small" data-out="output.html">Abrir</button></span></div>
    <div class="setting-row"><label>Pantalla grande<span class="hint">Marcador estilo estadio · display.html</span></label>
      <span class="switch"><button class="btn small" data-out="display.html">Abrir</button></span></div>`;

  // Fondo de la pantalla grande — UNA sola fuente, elegida por modo.
  const bg = E.loadBg() || {};
  const gal = bg.gallery || {}, gfiles = gal.files || [];
  const bgMode = bg.mode || (gal.enabled && gfiles.length ? "gallery" : bg.image ? "image" : "color");
  const bgOn = !!bg.enabled;
  const seg = (m, label) => `<button class="seg-btn${bgMode === m ? " active" : ""}" data-bgmode="${m}">${label}</button>`;
  html += `<h3 class="sec-title">🎨 Fondo · pantalla grande</h3>
    <p class="hint" style="margin:2px 0 10px">Enciende el fondo para que la pantalla grande (display.html) deje de ser transparente. Para Resolume normalmente lo dejas apagado.</p>
    <div class="setting-row"><label>Mostrar fondo<span class="hint">${bgOn ? "Encendido — se ve el fondo elegido" : "Apagado — pantalla transparente"}</span></label>
      <button class="btn small ${bgOn ? "success" : ""}" id="bgEnabled">${bgOn ? "● Activo" : "Desactivado"}</button></div>
    <div class="seg">${seg("color", "🎨 Color")}${seg("image", "🖼️ Imagen")}${seg("gallery", "🗂️ Galería")}</div>`;

  if (bgMode === "color") {
    const curHex = (bg.color && /^#[0-9a-fA-F]{6}$/.test(bg.color)) ? bg.color.toLowerCase() : "#0a0f1c";
    const swatches = ["#000000", "#0a0f1c", "#1e1e1e", "#0047ab", "#00b140", "#0b3d2e", "#7a0026", "#ffffff"];
    html += `<div class="setting-row"><label>Color de fondo</label>
      <span class="switch">
        <input type="color" id="bgColor" value="${E.esc(curHex)}" title="Selector del sistema">
        <input type="text" id="bgColorHex" value="${E.esc(curHex)}" maxlength="7" spellcheck="false" placeholder="#0a0f1c" style="width:88px;text-transform:lowercase"></span></div>
    <div class="bg-swatches">` + swatches.map((c) =>
      `<button class="bg-sw${c === curHex ? " sel" : ""}" data-swatch="${c}" title="${c}" style="background:${c}"></button>`).join("") + `</div>`;
  } else if (bgMode === "image") {
    html += `<div class="setting-row"><label>Imagen de fondo<span class="hint">${bg.image ? "Imagen cargada" : "Sube una imagen (se ajusta a pantalla)"}</span></label>
      <span class="switch"><label class="btn small file-btn">${bg.image ? "Cambiar" : "Subir imagen"}<input type="file" accept="image/*" id="bgImage" hidden></label>
      ${bg.image ? `<button class="btn small ghost" id="bgImageClear">Quitar</button>` : ""}</span></div>`;
    if (bg.image) html += `<div class="bg-gallery"><div class="bg-thumb sel" style="background-image:url('${bg.image}')"></div></div>`;
  } else {
    html += `<div class="setting-row"><label>Galería de carpeta<span class="hint">Pon tus fotos en <code>fondos/</code> y púlsalo</span></label>
      <button class="btn small" id="bgScan">Buscar en /fondos</button></div>`;
    if (gfiles.length) {
      html += `<div class="setting-row"><label>Cambio automático<span class="hint">Pasa las fotos solas, en bucle</span></label>
        <span class="switch"><input type="number" id="galSec" value="${gal.intervalSec || 8}" min="2" max="600" style="width:60px"> s
        <button class="btn small ${gal.auto ? "success" : ""}" id="galAuto">${gal.auto ? "● Auto ON" : "Activar auto"}</button></span></div>
        <p class="hint" style="margin:2px 0 8px">${gal.auto ? "Pasando solas." : "Toca una foto para fijarla."}</p>`;
      html += `<div class="bg-gallery">` + gfiles.map((f, i) => {
        const sel = !gal.auto && gal.index === i ? " sel" : "";
        return `<button class="bg-thumb${sel}" data-galpick="${i}" title="${E.esc(f)}" style="background-image:url('${E.esc(gal.dir || "fondos/")}${E.esc(f)}')"></button>`;
      }).join("") + `</div>`;
    } else {
      html += `<p class="hint">Aún no hay fotos. Copia imágenes en la carpeta <code>fondos/</code> y pulsa "Buscar en /fondos".</p>`;
    }
  }

  // Sponsors / publicidad (carrusel de la barra inferior)
  const sp = sponsorsState();
  html += `<h3 class="sec-title">📢 Sponsors · banner publicitario</h3>
    <p class="hint" style="margin:2px 0 10px">Banda inferior en <b>output.html</b> con los logos desplazándose en bucle (carrusel). Independiente del marcador: sigue aunque ocultes el gráfico.</p>
    <div class="setting-row"><label>Mostrar carrusel<span class="hint">${sp.logos.length ? sp.logos.length + " logo(s) cargado(s)" : "Sube logos abajo"}</span></label>
      <button class="btn small ${sp.enabled ? "success" : ""}" id="spToggle">${sp.enabled ? "● Activo" : "Desactivado"}</button></div>
    <div class="setting-row"><label>Velocidad<span class="hint">Píxeles por segundo · constante (más = más rápido). Típico 80–200</span></label>
      <span class="switch"><input type="number" id="spSpeed" value="${sp.speed}" min="20" max="600" step="10" style="width:64px"> px/s</span></div>
    <div class="setting-row"><label>Añadir logos<span class="hint">Puedes seleccionar varios a la vez · PNG con transparencia recomendado</span></label>
      <span class="switch"><label class="btn small file-btn">Subir logos<input type="file" accept="image/*" id="spFiles" multiple hidden></label>
      ${sp.logos.length ? `<button class="btn small ghost" id="spClear">Quitar todos</button>` : ""}</span></div>`;
  if (sp.logos.length) {
    html += `<div class="bg-gallery">` + sp.logos.map((src, i) =>
      `<button class="bg-thumb sp-thumb" data-spdel="${i}" title="Quitar este logo" style="background-image:url('${src}')"><span class="sp-del">✕</span></button>`
    ).join("") + `</div>`;
  }

  // Control externo
  const midiOn = !!midiAccess, binds = midiBindings(), rev = {};
  for (const k in binds) rev[binds[k]] = k;
  html += `<h3 class="sec-title">🎛️ Control externo</h3>
    <div class="setting-row"><label>MIDI<span class="hint">${midiOn ? "Activo · " + (midiInputNames().join(", ") || "sin dispositivos") : "Desactivado"}</span></label>
      <button class="btn ${midiOn ? "success" : ""}" id="btnMidi">${midiOn ? "Reescanear" : "Activar MIDI"}</button></div>
    <div class="setting-row"><label>Stream Deck (WebSocket)<span class="hint">Opcional. Con atajos no hace falta.</span></label>
      <span class="switch"><input type="text" id="wsUrl" placeholder="ws://localhost:9000" value="${E.esc(localStorage.getItem("mm_ws") || "")}">
      <button class="btn" id="btnWs">Conectar</button></span></div>
    <p class="hint" style="margin:10px 0 4px">Tecla = atajo (acción <i>Hotkey</i> de Stream Deck). Pulsa “Aprender” y toca un control MIDI.</p>
    <div class="ctrl-table"><div class="ctrl-row ctrl-head"><span>Acción</span><span>Tecla</span><span>MIDI</span><span></span></div>`;
  html += COMMAND_LIST.map(([id, label, key]) => `<div class="ctrl-row">
      <span class="ctrl-label">${label}</span><span class="ctrl-key">${key}</span>
      <span class="ctrl-midi">${rev[id] ? `<code>${rev[id]}</code>` : "<span class='muted'>—</span>"}</span>
      <button class="btn small ${midiLearnTarget === id ? "success" : ""}" data-learn="${id}" ${midiOn ? "" : "disabled"}>
        ${midiLearnTarget === id ? "Pulsa MIDI…" : "Aprender"}</button></div>`).join("");
  html += `</div>`;
  body.innerHTML = html;

  body.querySelectorAll("[data-cfg]").forEach((inp) => {
    inp.onchange = () => {
      const val = inp.type === "checkbox" ? inp.checked : Number(inp.value);
      E.saveCfgOverride(match.sport, { [inp.dataset.cfg]: val }); sync();
    };
  });
  const g = body.querySelector("#set-golden");
  if (g) g.onchange = () => { E.saveCfgOverride(match.sport, { golden: g.checked }); };
  body.querySelectorAll("[data-out]").forEach((b) => {
    b.onclick = () => window.open(b.dataset.out, "mm_" + b.dataset.out.replace(/\W+/g, "_"));
  });
  const bgEnabled = body.querySelector("#bgEnabled");
  if (bgEnabled) bgEnabled.onclick = () => { const b = E.loadBg() || {}; b.enabled = !b.enabled; E.saveBg(b); openSettings(); };
  body.querySelectorAll("[data-bgmode]").forEach((b) => (b.onclick = () => setBgMode(b.dataset.bgmode)));
  const bgColor = body.querySelector("#bgColor");
  const bgColorHex = body.querySelector("#bgColorHex");
  // Cambiar color EN VIVO sin re-renderizar el panel (re-render cerraría el selector
  // del sistema). Sincroniza selector nativo + campo hex + muestras a mano.
  const setBgColor = (hex) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    hex = hex.toLowerCase();
    const b = E.loadBg() || {}; b.color = hex; b.mode = "color"; b.enabled = true; E.saveBg(b);
    if (bgColor && bgColor.value.toLowerCase() !== hex) bgColor.value = hex;
    if (bgColorHex && document.activeElement !== bgColorHex) bgColorHex.value = hex;
    body.querySelectorAll("[data-swatch]").forEach((sw) => sw.classList.toggle("sel", sw.dataset.swatch === hex));
  };
  if (bgColor) bgColor.oninput = (e) => setBgColor(e.target.value);
  if (bgColorHex) bgColorHex.oninput = (e) => {
    let v = e.target.value.trim().toLowerCase();
    if (v && v[0] !== "#") v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setBgColor(v);
  };
  body.querySelectorAll("[data-swatch]").forEach((sw) => (sw.onclick = () => setBgColor(sw.dataset.swatch)));
  const bgImage = body.querySelector("#bgImage");
  if (bgImage) bgImage.onchange = (e) => handleBgImage(e.target.files[0]);
  const bgClear = body.querySelector("#bgImageClear");
  if (bgClear) bgClear.onclick = () => { const b = E.loadBg() || {}; b.image = ""; E.saveBg(b); openSettings(); };
  const bgScan = body.querySelector("#bgScan");
  if (bgScan) bgScan.onclick = scanBgFolder;
  const galAuto = body.querySelector("#galAuto");
  if (galAuto) galAuto.onclick = () => {
    const b = E.loadBg() || {}; b.gallery = b.gallery || {};
    const sec = Number(body.querySelector("#galSec").value) || 8;
    b.gallery.intervalSec = Math.min(600, Math.max(2, sec));
    b.gallery.enabled = true; b.gallery.auto = !b.gallery.auto; b.mode = "gallery"; b.enabled = true;
    E.saveBg(b); openSettings();
  };
  body.querySelectorAll("[data-galpick]").forEach((btn) => {
    btn.onclick = () => {
      const b = E.loadBg() || {}; b.gallery = b.gallery || {};
      b.gallery.enabled = true; b.gallery.auto = false; b.gallery.index = Number(btn.dataset.galpick); b.mode = "gallery"; b.enabled = true;
      E.saveBg(b); openSettings();
    };
  });
  const spToggle = body.querySelector("#spToggle");
  if (spToggle) spToggle.onclick = () => { const s = sponsorsState(); s.enabled = !s.enabled; E.saveSponsors(s); openSettings(); };
  const spSpeed = body.querySelector("#spSpeed");
  if (spSpeed) spSpeed.onchange = () => {
    const s = sponsorsState(); s.speed = Math.min(600, Math.max(20, Number(spSpeed.value) || 120));
    E.saveSponsors(s);
  };
  const spFiles = body.querySelector("#spFiles");
  if (spFiles) spFiles.onchange = (e) => handleSponsorLogos(e.target.files);
  const spClear = body.querySelector("#spClear");
  if (spClear) spClear.onclick = () => { if (confirm("¿Quitar todos los sponsors?")) { const s = sponsorsState(); s.logos = []; E.saveSponsors(s); openSettings(); } };
  body.querySelectorAll("[data-spdel]").forEach((b) => {
    b.onclick = () => { const s = sponsorsState(); s.logos.splice(Number(b.dataset.spdel), 1); E.saveSponsors(s); openSettings(); };
  });
  body.querySelector("#btnMidi").onclick = enableMidi;
  body.querySelector("#btnWs").onclick = () => connectWs(body.querySelector("#wsUrl").value.trim());
  body.querySelectorAll("[data-learn]").forEach((b) => {
    b.onclick = () => {
      if (!midiAccess) { toast("Activa MIDI primero"); return; }
      midiLearnTarget = midiLearnTarget === b.dataset.learn ? null : b.dataset.learn;
      openSettings();
    };
  });
  $("settingsModal").hidden = false;
}
function numRow(key, label, val, min, max) {
  return `<div class="setting-row"><label>${label}</label><input type="number" data-cfg="${key}" value="${val}" min="${min}" max="${max}"></div>`;
}
function selRow(key, label, val, opts) {
  const o = opts.map(([t, v]) => `<option value="${v}" ${v === val ? "selected" : ""}>${t}</option>`).join("");
  return `<div class="setting-row"><label>${label}</label><select data-cfg="${key}">${o}</select></div>`;
}

function openHistory() {
  const body = $("historyBody");
  const hist = loadHistory();
  // Migra entradas antiguas (sin id) para poder borrarlas.
  let changed = false;
  hist.forEach((h, i) => { if (!h.id) { h.id = "legacy" + i + "_" + (h.date || 0); changed = true; } });
  if (changed) saveHistory(hist);

  if (!hist.length) { body.innerHTML = `<p class="empty">No hay partidos guardados.</p>`; }
  else body.innerHTML = hist.map((h) => {
    const d = new Date(h.date);
    const ds = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const wa = h.winner === "A" ? " 🏆" : "", wb = h.winner === "B" ? " 🏆" : "";
    return `<div class="history-item"><div class="h-main">
        <span class="h-sport">${h.icon} ${h.sport}</span>
        <span class="h-teams">${E.esc(h.a)}${wa} vs ${E.esc(h.b)}${wb}</span>
        <span class="h-date">${ds}</span></div>
      <span class="h-score">${h.scoreA} - ${h.scoreB}</span>
      <span class="h-actions">
        ${h.match ? `<button class="btn small" data-load="${h.id}">↩️ Recargar</button>` : ""}
        <button class="btn small ghost" data-del="${h.id}" title="Borrar">🗑️</button>
      </span></div>`;
  }).join("");

  body.querySelectorAll("[data-load]").forEach((b) => (b.onclick = () => loadSavedMatch(b.dataset.load)));
  body.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => deleteSavedMatch(b.dataset.del)));
  $("historyModal").hidden = false;
}

let toastTimer = null;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 1700);
}

/* ============================================================
   WIRING + INIT
   ============================================================ */
function wire() {
  $("btnUndo").onclick = undo;
  $("btnSwap").onclick = () => runCommand("swap");
  $("btnSave").onclick = saveMatch;
  $("btnReset").onclick = resetMatch;
  $("btnOpenOutput").onclick = openOutput;
  $("btnSettings").onclick = openSettings;
  $("btnHistory").onclick = openHistory;
  $("btnClearHistory").onclick = () => { if (confirm("¿Borrar historial?")) { localStorage.setItem(HISTORY_KEY, "[]"); openHistory(); } };

  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => { $("settingsModal").hidden = true; $("historyModal").hidden = true; }));
  document.querySelectorAll(".modal-overlay").forEach((ov) => ov.addEventListener("click", (e) => { if (e.target === ov) ov.hidden = true; }));
  document.addEventListener("keydown", handleKey);

  // Tick del reloj del Control sin re-render completo (el Preview/iframe corre el suyo).
  setInterval(() => {
    const cf = c();
    if (cf.clockMode === "off") return;
    // Cuenta atrás: detener al llegar a 0.
    if (cf.clockMode === "down" && match.clock.running && E.clockEnded(match)) {
      apply((m) => { m.clock.accumMs = E.limitMs(m); m.clock.running = false; }, false);
      return;
    }
    $("bigClock").textContent = E.clockText(match) || "—";
    $("bigClock").className = "big-clock" + (match.clock.running ? " run" : "") + (E.clockEnded(match) ? " over" : "");
  }, 200);
}

function init() {
  wire();
  sync(); // publica el estado inicial para que el Preview (iframe) y las salidas lo tomen al cargar
  if (localStorage.getItem("mm_midi_on")) enableMidi();
  const wsUrl = localStorage.getItem("mm_ws");
  if (wsUrl) connectWs(wsUrl);
  startNdiSync(); // empuja el estado a la app NDI si está abierta (no-op si no)
}
init();
