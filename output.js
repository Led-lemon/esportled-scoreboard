/* ============================================================
   OUTPUT · pantalla de salida (broadcast / OBS)
   Recibe el estado del Control y dibuja el marcador.
   ============================================================ */
import { SYNC, loadMatch } from "./engine.js";
import { drawScoreboard, tickClock } from "./scoreboard.js";

const stage = document.getElementById("stage");
const waiting = document.getElementById("waiting");
let match = null;

// Fondo: transparente por defecto (OBS). ?bg=solid → fondo sólido.
const params = new URLSearchParams(location.search);
if (params.get("bg") === "solid") document.body.classList.add("solid");

function refresh() {
  const m = loadMatch();
  if (!m) { waiting.style.display = "block"; stage.innerHTML = ""; match = null; return; }
  waiting.style.display = "none";
  match = m;
  drawScoreboard(stage, match);
}

if (SYNC) SYNC.onmessage = (e) => { if (e.data?.type === "state") refresh(); };
window.addEventListener("storage", (e) => { if (e.key === "mm_match") refresh(); });

// Tick del reloj sin redibujar (evita recargar logos).
setInterval(() => { if (match) tickClock(stage, match); }, 200);

refresh();
