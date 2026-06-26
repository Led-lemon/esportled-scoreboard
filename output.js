/* ============================================================
   OUTPUT · pantalla de salida (broadcast / OBS)
   Recibe el estado del Control y dibuja el marcador.
   ============================================================ */
import { SYNC, loadMatch, loadSponsors, connectRemoteReceiver } from "./engine.js";
import { drawScoreboard, drawSponsors, tickClock } from "./scoreboard.js";

const stage = document.getElementById("stage");
const sponsors = document.getElementById("sponsors");
const waiting = document.getElementById("waiting");
let match = null;

function refreshSponsors() { drawSponsors(sponsors, loadSponsors()); }

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

if (SYNC) SYNC.onmessage = (e) => {
  if (e.data?.type === "state") refresh();
  else if (e.data?.type === "sponsors") refreshSponsors();
};
window.addEventListener("storage", (e) => {
  if (e.key === "mm_match") refresh();
  else if (e.key === "mm_sponsors") refreshSponsors();
});

// Tick del reloj sin redibujar (evita recargar logos).
setInterval(() => { if (match) tickClock(stage, match); }, 200);

// Recepción por relay (app de escritorio); en web normal no hace nada.
connectRemoteReceiver({ state: refresh, sponsors: refreshSponsors });

refresh();
refreshSponsors();
