/* ============================================================
   SCOREBOARD · gráfico broadcast (usado por Salida y Preview)
   ============================================================ */
import {
  resolveCfg, scoreLabel, periodLabel, clockText, clockEnded,
  addedText, initials, esc, other,
} from "./engine.js";

export function drawScoreboard(root, m) {
  const c = resolveCfg(m.sport);
  root.className = "sb-wrap";
  root.innerHTML = `
    <div class="sb sb-${c.scoring} ${m.finished ? "sb-final" : ""} ${m.onAir ? "" : "sb-hidden"}" data-sport="${m.sport}">
      ${side(m, "A", c)}
      <div class="sb-mid">
        <div class="sb-period">${esc(periodLabel(m))}</div>
        ${c.clockMode !== "off" ? `<div class="sb-clock ${clockEnded(m) ? "over" : ""} ${m.clock.running ? "run" : ""}">${clockText(m)}</div>` : ""}
        ${addedText(m) ? `<div class="sb-added">${addedText(m)}</div>` : ""}
      </div>
      ${side(m, "B", c)}
    </div>`;
}

function side(m, who, c) {
  const t = m[who];
  const logo = t.logo
    ? `<div class="sb-logo"><img src="${t.logo}" alt=""></div>`
    : `<div class="sb-logo sb-initials">${esc(initials(t))}</div>`;
  const serveDot = (c.feat.serving && m.serving === who) ? `<span class="sb-serve" title="Saque">●</span>` : "";
  const possDot = (c.feat.possession && m.possession === who) ? `<span class="sb-poss">◄</span>` : "";

  let tags = "";
  if (c.feat.cards) {
    if (t.yellow) tags += `<span class="sb-tag yel">${t.yellow}</span>`;
    if (t.red) tags += `<span class="sb-tag red">${t.red}</span>`;
  }
  if (c.feat.fouls && t.fouls) tags += `<span class="sb-tag foul">F${t.fouls}</span>`;

  return `
    <div class="sb-side sb-${who.toLowerCase()}" style="--tc:${esc(t.color)}">
      ${logo}
      <div class="sb-id">
        <div class="sb-name">${esc(t.name)} ${serveDot}${possDot}</div>
        <div class="sb-tags">${tags}</div>
      </div>
      ${cluster(m, who, c)}
    </div>`;
}

function cluster(m, who, c) {
  if (c.scoring === "set") {
    return `<div class="sb-cluster">
      <div class="sb-sets" title="Sets">${m[who].sets}</div>
      <div class="sb-main">${scoreLabel(m, who)}</div>
    </div>`;
  }
  if (c.scoring === "tennis") {
    const boxes = m.setHistory.map((s) => `<span class="sb-setbox">${s[who]}</span>`).join("");
    return `<div class="sb-cluster">
      <div class="sb-setrow">${boxes}<span class="sb-setbox cur">${m[who].games}</span></div>
      <div class="sb-main">${scoreLabel(m, who)}</div>
    </div>`;
  }
  return `<div class="sb-cluster"><div class="sb-main">${scoreLabel(m, who)}</div></div>`;
}

/* ============================================================
   PANTALLA GRANDE · display para Resolume / monitor
   Marcador estilo estadio: nombres arriba · número de cada equipo
   en su panel de color · logos en los extremos · reloj en caja
   central · tarjetas en barras. Reusa el estado de engine.js.
   ============================================================ */
export function drawBig(root, m) {
  const c = resolveCfg(m.sport);
  root.className = `big-wrap bb-wrap ${m.finished ? "big-final" : ""} ${m.onAir ? "" : "big-hidden"}`;
  root.innerHTML = `
    <div class="bb-board" data-sport="${m.sport}">
      <div class="bb-names">
        <div class="bb-name" style="--tc:${esc(m.A.color)}">${esc(m.A.name)}</div>
        <div class="bb-name" style="--tc:${esc(m.B.color)}">${esc(m.B.name)}</div>
      </div>
      <div class="bb-main">
        ${bbLogo(m, "A")}
        <div class="bb-panels">
          ${bbPanel(m, "A", c)}
          ${bbPanel(m, "B", c)}
        </div>
        ${bbLogo(m, "B")}
      </div>
      <div class="bb-bottom">
        ${bbBar(m, "A", c)}
        <div class="bb-clockbox">
          <div class="bb-period">${esc(periodLabel(m))}</div>
          ${c.clockMode !== "off"
            ? `<div class="sb-clock bb-clock ${clockEnded(m) ? "over" : ""} ${m.clock.running ? "run" : ""}">${clockText(m)}</div>`
            : ""}
          ${addedText(m) ? `<div class="bb-added">${addedText(m)}</div>` : ""}
        </div>
        ${bbBar(m, "B", c)}
      </div>
    </div>`;
}

function bbLogo(m, who) {
  const t = m[who];
  return t.logo
    ? `<div class="bb-logo"><img src="${t.logo}" alt=""></div>`
    : `<div class="bb-logo bb-initials${t.color === "transparent" ? " bb-transp" : ""}" style="--tc:${esc(t.color)}">${esc(initials(t))}</div>`;
}

function bbPanel(m, who, c) {
  const t = m[who];
  const transp = t.color === "transparent" ? " bb-transp" : "";
  const sets = (c.scoring === "set" || c.scoring === "tennis") ? `<span class="bb-sets">${t.sets}</span>` : "";
  const serve = (c.feat.serving && m.serving === who) ? `<span class="bb-mark bb-serve" title="Saque">●</span>` : "";
  const poss = (c.feat.possession && m.possession === who) ? `<span class="bb-mark bb-poss" title="Posesión">◄</span>` : "";
  return `<div class="bb-panel${transp}" style="--tc:${esc(t.color)}">
    ${sets}${serve}${poss}
    <span class="bb-num">${scoreLabel(m, who)}</span>
  </div>`;
}

function bbBar(m, who, c) {
  const t = m[who];
  let chips = "";
  if (c.feat.cards) {
    for (let i = 0; i < t.yellow; i++) chips += `<span class="bb-card yel"></span>`;
    for (let i = 0; i < t.red; i++) chips += `<span class="bb-card red"></span>`;
  }
  if (c.feat.fouls && t.fouls) chips += `<span class="bb-foul">F${t.fouls}</span>`;
  return `<div class="bb-bar bb-bar-${who.toLowerCase()}" style="--tc:${esc(t.color)}">${chips}</div>`;
}

/* Actualiza solo el reloj (para el tick sin redibujar logos). */
export function tickClock(root, m) {
  const c = resolveCfg(m.sport);
  if (c.clockMode === "off") return;
  const el = root.querySelector(".sb-clock");
  if (el) {
    el.textContent = clockText(m);
    el.classList.toggle("over", clockEnded(m));
    el.classList.toggle("run", m.clock.running);
  }
}
