/* ============================================================
   ENGINE · lógica compartida del Multi-Marcador
   Módulo ES usado por el Control y por la Salida (output).
   ============================================================ */

export const SPORTS = {
  futbol: {
    name: "Fútbol", icon: "⚽",
    clockMode: "up", defMin: 45, scoring: "count",
    periods: ["1ER TIEMPO", "2DO TIEMPO", "PRÓRROGA 1", "PRÓRROGA 2"],
    feat: { fouls: true, cards: true, added: true },
  },
  basquet: {
    name: "Baloncesto", icon: "🏀",
    clockMode: "down", defMin: 10, scoring: "basket",
    periods: ["1ER CUARTO", "2DO CUARTO", "3ER CUARTO", "4TO CUARTO", "PRÓRROGA"],
    feat: { fouls: true, possession: true },
  },
  voley: {
    name: "Vóley", icon: "🏐",
    clockMode: "off", scoring: "set",
    setPoints: 25, lastSetPoints: 15, bestOf: 5,
    feat: { serving: true },
  },
  tenis: {
    name: "Tenis", icon: "🎾",
    clockMode: "off", scoring: "tennis",
    bestOf: 3, golden: false,
    feat: { serving: true },
  },
  padel: {
    name: "Pádel", icon: "🏓",
    clockMode: "off", scoring: "tennis",
    bestOf: 3, golden: true,
    feat: { serving: true },
  },
  rugby: {
    name: "Rugby", icon: "🏉",
    clockMode: "up", defMin: 40, scoring: "rugby",
    periods: ["1ER TIEMPO", "2DO TIEMPO", "PRÓRROGA 1", "PRÓRROGA 2"],
    feat: { cards: true, added: true },
  },
};

export const POINTS = ["0", "15", "30", "40"];
export const other = (w) => (w === "A" ? "B" : "A");
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- Configuración con overrides ---------- */
export function resolveCfg(sport) {
  let over = {};
  try { over = JSON.parse(localStorage.getItem("mm_cfg_" + sport) || "{}"); } catch {}
  return Object.assign({}, SPORTS[sport], over);
}
export function saveCfgOverride(sport, patch) {
  let o = {};
  try { o = JSON.parse(localStorage.getItem("mm_cfg_" + sport) || "{}"); } catch {}
  Object.assign(o, patch);
  localStorage.setItem("mm_cfg_" + sport, JSON.stringify(o));
}

/* ---------- Estado del partido ---------- */
function defaultTeam(name, short, color) {
  return { name, short, color, logo: null, score: 0, fouls: 0, yellow: 0, red: 0, games: 0, sets: 0, point: 0, adv: false };
}
export function createMatch(sport) {
  const c = resolveCfg(sport);
  return {
    sport,
    A: defaultTeam("LOCAL", "LOC", "#2563eb"),
    B: defaultTeam("VISITANTE", "VIS", "#dc2626"),
    period: 0,
    serving: c.feat.serving ? "A" : null,
    possession: c.feat.possession ? "A" : null,
    tiebreak: false,
    finished: null,
    setHistory: [],
    clock: { running: false, accumMs: 0, lastStart: 0, addedMin: 0 },
    onAir: true,
  };
}

/* ---------- Reloj ---------- */
export function elapsed(m) {
  const k = m.clock;
  return k.accumMs + (k.running ? Date.now() - k.lastStart : 0);
}
export function limitMs(m) {
  const c = resolveCfg(m.sport);
  return (c.defMin || 0) * 60000;
}
export function fmt(ms) {
  ms = Math.max(0, Math.round(ms));
  const tot = Math.floor(ms / 1000);
  const m = String(Math.floor(tot / 60)).padStart(2, "0");
  const s = String(tot % 60).padStart(2, "0");
  return `${m}:${s}`;
}
export function clockText(m) {
  const c = resolveCfg(m.sport);
  if (c.clockMode === "off") return "";
  if (c.clockMode === "down") return fmt(Math.max(0, limitMs(m) - elapsed(m)));
  return fmt(elapsed(m));
}
export function clockEnded(m) {
  const c = resolveCfg(m.sport);
  if (c.clockMode === "down") return limitMs(m) > 0 && elapsed(m) >= limitMs(m);
  if (c.clockMode === "up") return limitMs(m) > 0 && elapsed(m) >= limitMs(m);
  return false;
}
export function addedText(m) {
  const c = resolveCfg(m.sport);
  if (!c.feat?.added || !m.clock.addedMin) return "";
  return "+" + m.clock.addedMin + "'";
}
export function toggleClock(m) {
  const c = resolveCfg(m.sport);
  const k = m.clock;
  if (k.running) { k.accumMs = elapsed(m); k.running = false; }
  else {
    if (c.clockMode === "down" && limitMs(m) > 0 && elapsed(m) >= limitMs(m)) return;
    k.lastStart = Date.now(); k.running = true;
  }
}
export function resetClock(m) { m.clock = { running: false, accumMs: 0, lastStart: 0, addedMin: 0 }; }
export function addAdded(m, n) { m.clock.addedMin = Math.max(0, m.clock.addedMin + n); }
export function changePeriod(m, dir) {
  const c = resolveCfg(m.sport);
  if (!c.periods) return;
  const np = m.period + dir;
  if (np < 0 || np >= c.periods.length) return;
  m.period = np;
  resetClock(m);
}
export function periodLabel(m) {
  const c = resolveCfg(m.sport);
  if (c.periods) return c.periods[m.period] || "—";
  const setsPlayed = m.A.sets + m.B.sets + 1;
  return m.finished ? "FINAL" : "SET " + setsPlayed;
}

/* ---------- Puntuación ---------- */
export function addCount(m, who, n) {
  if (m.finished) return;
  m[who].score = Math.max(0, m[who].score + n);
}
export function addStat(m, who, key, n) {
  m[who][key] = Math.max(0, (m[who][key] || 0) + n);
}
export function primaryScore(m, who) {
  const c = resolveCfg(m.sport);
  if (m.finished) return;
  if (c.scoring === "count") addCount(m, who, 1);
  else if (c.scoring === "basket") addCount(m, who, 2);
  else if (c.scoring === "rugby") addCount(m, who, 5); // ensayo (acción principal)
  else if (c.scoring === "set") volleyPoint(m, who, 1);
  else if (c.scoring === "tennis") tennisPoint(m, who);
}

export function volleyPoint(m, who, n) {
  if (m.finished) return;
  const c = resolveCfg(m.sport), opp = other(who);
  if (n < 0) { m[who].score = Math.max(0, m[who].score - 1); return; }
  m[who].score++;
  m.serving = who;
  const setsPlayed = m.A.sets + m.B.sets;
  const target = setsPlayed === c.bestOf - 1 ? c.lastSetPoints : c.setPoints;
  if (m[who].score >= target && m[who].score - m[opp].score >= 2) {
    m.setHistory.push({ A: m.A.score, B: m.B.score });
    m[who].sets++;
    m.A.score = 0; m.B.score = 0;
    if (m[who].sets >= Math.ceil(c.bestOf / 2)) finish(m, who);
  }
}

export function tennisPoint(m, who) {
  if (m.finished) return;
  const c = resolveCfg(m.sport), opp = other(who);
  const a = m[who], b = m[opp];
  if (m.tiebreak) {
    a.point++;
    if (a.point >= 7 && a.point - b.point >= 2) { a.games++; winSet(m, who); }
    else togglePoint(m);
    return;
  }
  if (c.golden && a.point === 3 && b.point === 3) { winGame(m, who); return; }
  if (a.point < 3) a.point++;
  else if (b.point < 3) winGame(m, who);
  else if (a.adv) winGame(m, who);
  else if (b.adv) b.adv = false;
  else a.adv = true;
}
function winGame(m, who) {
  const opp = other(who);
  m[who].games++;
  m.A.point = m.B.point = 0; m.A.adv = m.B.adv = false;
  togglePoint(m);
  const g = m[who].games, og = m[opp].games;
  if (g >= 6 && g - og >= 2) winSet(m, who);
  else if (g === 6 && og === 6) m.tiebreak = true;
}
function winSet(m, who) {
  const c = resolveCfg(m.sport);
  m.setHistory.push({ A: m.A.games, B: m.B.games, tb: m.tiebreak });
  m[who].sets++;
  m.tiebreak = false;
  m.A.games = m.B.games = 0; m.A.point = m.B.point = 0; m.A.adv = m.B.adv = false;
  if (m[who].sets >= Math.ceil(c.bestOf / 2)) finish(m, who);
}
function togglePoint(m) { if (m.serving) m.serving = other(m.serving); }
function finish(m, who) { m.finished = who; m.clock.accumMs = elapsed(m); m.clock.running = false; }

export function setServe(m, who) { const c = resolveCfg(m.sport); if (c.feat.serving) m.serving = who; }
export function setPossession(m, who) { const c = resolveCfg(m.sport); if (c.feat.possession) m.possession = who; }

export function swapSides(m) {
  const a = m.A; m.A = m.B; m.B = a;
  if (m.serving) m.serving = other(m.serving);
  if (m.possession) m.possession = other(m.possession);
  if (m.finished) m.finished = other(m.finished);
  m.setHistory = m.setHistory.map((s) => ({ A: s.B, B: s.A, tb: s.tb }));
}

/* ---------- Etiquetas de marcador ---------- */
export function scoreLabel(m, who) {
  const c = resolveCfg(m.sport);
  if (c.scoring === "tennis") {
    if (m.tiebreak) return String(m[who].point);
    if (m[who].adv) return "AD";
    if (m[who].point === 3 && m[other(who)].point === 3) return "40";
    return POINTS[m[who].point];
  }
  return String(m[who].score);
}

/* ---------- Sincronización Control ↔ Salida ---------- */
export const SYNC = ("BroadcastChannel" in self) ? new BroadcastChannel("mm_sync") : null;

/* Sync remoto opcional: para consumidores en OTRO navegador (p. ej. la app NDI
   de Electron), que no comparten localStorage/BroadcastChannel con el Control.
   El Control registra un emisor con setRemoteSync(); aquí solo se invoca. No-op
   si nadie escucha, así que no afecta al funcionamiento normal. */
let _remoteSync = null;
export function setRemoteSync(fn) { _remoteSync = fn; }
function _emitRemote(type, data) { try { if (_remoteSync) _remoteSync({ type, data }); } catch {} }

export function publish(m) {
  try { localStorage.setItem("mm_match", JSON.stringify(m)); } catch {}
  if (SYNC) SYNC.postMessage({ type: "state" });
  _emitRemote("state", m);
}
export function loadMatch() {
  try {
    const raw = localStorage.getItem("mm_match");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/* Receptor remoto para las SALIDAS (app de escritorio).
   Entre ventanas separadas de Electron, localStorage/BroadcastChannel no
   propagan de forma fiable. Si hay un relay local (la app NDI/escritorio en
   ws://127.0.0.1:9011), la salida recibe el estado por ahí: lo guarda en su
   propio localStorage y dispara el handler para redibujar. Silencioso y con
   reintento si no hay relay (flujo web normal: sigue valiendo el canal local). */
export function connectRemoteReceiver(handlers = {}) {
  if (typeof WebSocket === "undefined") return;
  const KEY = { state: "mm_match", bg: "mm_bg", sponsors: "mm_sponsors" };
  let ws = null;
  const connect = () => {
    try {
      ws = new WebSocket("ws://127.0.0.1:9011");
      ws.onmessage = (ev) => {
        try {
          const { type, data } = JSON.parse(ev.data);
          if (!KEY[type]) return;
          try { localStorage.setItem(KEY[type], JSON.stringify(data)); } catch {}
          if (typeof handlers[type] === "function") handlers[type]();
        } catch {}
      };
      ws.onclose = () => { ws = null; setTimeout(connect, 5000); };
      ws.onerror = () => { try { ws.close(); } catch {} };
    } catch { setTimeout(connect, 5000); }
  };
  connect();
}

/* ---------- Fondo personalizado de la pantalla grande ----------
   Global (no por partido). { color, image }. La imagen manda sobre el color. */
export function loadBg() {
  try { return JSON.parse(localStorage.getItem("mm_bg") || "null"); } catch { return null; }
}
export function saveBg(bg) {
  try { localStorage.setItem("mm_bg", JSON.stringify(bg || {})); } catch {}
  if (SYNC) SYNC.postMessage({ type: "bg" });
  _emitRemote("bg", bg || {});
}

/* ---------- Sponsors · carrusel publicitario (global, no por partido) ----------
   Modelo: { enabled, speed, logos: [dataURL, ...] }. `speed` = segundos por vuelta
   completa de la marquesina. Se emite por el mismo canal con {type:"sponsors"}. */
export function loadSponsors() {
  try { return JSON.parse(localStorage.getItem("mm_sponsors") || "null"); } catch { return null; }
}
export function saveSponsors(s) {
  try { localStorage.setItem("mm_sponsors", JSON.stringify(s || {})); } catch {}
  if (SYNC) SYNC.postMessage({ type: "sponsors" });
  _emitRemote("sponsors", s || {});
}

/* ---------- Utilidades ---------- */
export const cloneMatch = clone;
export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
export function initials(team) {
  const src = (team.short || team.name || "?").trim();
  return src.slice(0, 3).toUpperCase();
}
