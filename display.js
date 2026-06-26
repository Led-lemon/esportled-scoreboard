/* ============================================================
   DISPLAY · pantalla grande (Resolume / monitor / proyector)
   Recibe el estado del Control y dibuja el marcador a pantalla.
     ?bg=solid   → fondo sólido (gradiente integrado)
     ?bg=custom  → fondo personalizado del Control (imagen o color)
     (sin ?bg)   → transparente, para Resolume
   ============================================================ */
import { SYNC, loadMatch, loadBg, loadSponsors, connectRemoteReceiver } from "./engine.js";
import { drawBig, drawSponsors, tickClock } from "./scoreboard.js";

const stage = document.getElementById("stage");
const sponsors = document.getElementById("sponsors");
const waiting = document.getElementById("waiting");
let match = null;

function refreshSponsors() { drawSponsors(sponsors, loadSponsors()); }

const params = new URLSearchParams(location.search);
const bgParam = params.get("bg");
if (bgParam === "solid") document.body.classList.add("solid");

const SOLID_BG = "radial-gradient(1200px 800px at 50% 30%, #16213a, #070b14)";
const imgCss = (url) => `#0a0f1c url("${url}") center / cover no-repeat`;
const setBg = (css) => { document.body.style.background = css; };

let galleryTimer = null;
function stopGallery() { if (galleryTimer) { clearInterval(galleryTimer); galleryTimer = null; } }

function applyBg() {
  if (bgParam === "solid") return; // modo sólido fijo (gradiente por CSS), no se toca
  stopGallery();
  const bg = loadBg() || {};
  if (!bg.enabled) { setBg("transparent"); return; } // fondo OFF -> transparente (Resolume)
  const g = bg.gallery || {};
  const hasGallery = Array.isArray(g.files) && g.files.length;
  // Modo elegido en el Control. Compat con datos antiguos sin `mode`.
  const mode = bg.mode || (g.enabled && hasGallery ? "gallery" : bg.image ? "image" : "color");

  if (mode === "gallery" && hasGallery) {
    const dir = g.dir || "fondos/";
    const files = g.files;
    if (g.auto) {
      let i = Math.min(Math.max(0, g.index || 0), files.length - 1);
      setBg(imgCss(dir + files[i]));
      const sec = Math.min(600, Math.max(2, g.intervalSec || 8));
      galleryTimer = setInterval(() => {
        i = (i + 1) % files.length;
        setBg(imgCss(dir + files[i]));
      }, sec * 1000);
    } else {
      const i = Math.min(Math.max(0, g.index || 0), files.length - 1);
      setBg(imgCss(dir + files[i]));
    }
    return;
  }
  if (mode === "image" && bg.image) { setBg(imgCss(bg.image)); return; }
  setBg(bg.color || SOLID_BG);
}

function refresh() {
  const m = loadMatch();
  if (!m) { waiting.style.display = "block"; stage.innerHTML = ""; match = null; return; }
  waiting.style.display = "none";
  match = m;
  drawBig(stage, match);
}

if (SYNC) SYNC.onmessage = (e) => {
  if (e.data?.type === "state") refresh();
  else if (e.data?.type === "bg") applyBg();
  else if (e.data?.type === "sponsors") refreshSponsors();
};
window.addEventListener("storage", (e) => {
  if (e.key === "mm_match") refresh();
  else if (e.key === "mm_bg") applyBg();
  else if (e.key === "mm_sponsors") refreshSponsors();
});

// Tick del reloj sin redibujar (evita recargar logos).
setInterval(() => { if (match) tickClock(stage, match); }, 200);

// Recepción por relay (app de escritorio); en web normal no hace nada.
connectRemoteReceiver({ state: refresh, bg: applyBg, sponsors: refreshSponsors });

applyBg();
refresh();
refreshSponsors();
