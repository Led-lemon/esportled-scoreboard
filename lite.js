/* ============================================================
   ULTRA LITE · salida mínima (dos puntuaciones + tiempo en medio)
   Para resoluciones muy pequeñas. Se selecciona a mano como salida
   aparte (igual que output.html / display.html).
     ?w=512&h=128 → caja de ese tamaño exacto anclada arriba-izquierda (0,0).
                    Con el navegador a pantalla completa, el panel LED lee
                    justo ese rectángulo. Sin w/h → llena la pantalla.
     ?bg=solid    → fondo sólido dentro de la caja · (sin ?bg) → transparente
   ============================================================ */
import { SYNC, loadMatch, connectRemoteReceiver } from "./engine.js";
import { drawLite, tickClock } from "./scoreboard.js";

const stage = document.getElementById("stage");
const waiting = document.getElementById("waiting");
let match = null;

const params = new URLSearchParams(location.search);
if (params.get("bg") === "solid") stage.classList.add("solid");
// Tamaño exacto de la caja (píxeles), anclada en 0,0. Sin parámetros: pantalla completa.
const w = parseInt(params.get("w"), 10);
const h = parseInt(params.get("h"), 10);
if (w > 0) stage.style.width = w + "px";
if (h > 0) stage.style.height = h + "px";

function refresh() {
  const m = loadMatch();
  if (!m) { waiting.style.display = "block"; stage.innerHTML = ""; match = null; return; }
  waiting.style.display = "none";
  match = m;
  drawLite(stage, match);
}

if (SYNC) SYNC.onmessage = (e) => { if (e.data?.type === "state") refresh(); };
window.addEventListener("storage", (e) => { if (e.key === "mm_match") refresh(); });

// Un clic dentro entra/sale de pantalla completa: así queda limpia (sin barra
// del navegador) sobre el panel LED, sin tocar teclado.
document.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.().catch(() => {});
});

// Tick del reloj sin redibujar.
setInterval(() => { if (match) tickClock(stage, match); }, 200);

// Recepción por relay (app de escritorio); en web normal no hace nada.
connectRemoteReceiver({ state: refresh });

refresh();
