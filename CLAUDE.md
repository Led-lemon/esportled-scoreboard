# CLAUDE.md

Guía para trabajar en este proyecto. Léela antes de tocar el código.

## Qué es

**Multi-Marcador · Broadcast**: marcador deportivo profesional, app web sin frameworks
(JavaScript ES modules + CSS, sin build, sin dependencias en el front).
Deportes: **Fútbol, Baloncesto, Vóley, Tenis, Pádel**.

Arquitectura de **dos pantallas** sincronizadas:
- **Control** (`index.html`) — consola del operador.
- **Salida** (`output.html`) — gráfico broadcast con fondo transparente (para OBS).

## Cómo ejecutar

Debe servirse por HTTP (los módulos ES y la Web MIDI no funcionan con `file://`):

```bash
cd /Users/adfelipe/Documents/MARCADOR
python3 -m http.server 8080
```
- Control: http://localhost:8080/index.html
- Salida:  http://localhost:8080/output.html  (transparente · `?bg=solid` para fondo)

No hay tests ni linters configurados. Verificación rápida de sintaxis:
```bash
for f in engine.js scoreboard.js control.js output.js bridge.js; do node --check "$f"; done
```

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `engine.js` | **Toda la lógica**: config de deportes (`SPORTS`), estado del partido (`createMatch`), reglas/puntuación, reloj, persistencia y sincronización. Módulo puro reutilizado por Control y Salida. |
| `scoreboard.js` | Render de los gráficos broadcast: `drawScoreboard` (barra lower-third, usado por `output.html`) + `drawBig(root, m)` (pantalla grande estilo estadio, usado por `display.html`) + `tickClock`. El Preview del Control es un `<iframe>` a `display.html?bg=custom` (se sincroniza solo). |
| `scoreboard.css` | Estilos del gráfico: barra (`.sb-*`) y pantalla grande (`.bb-*`). |
| `index.html` / `control.js` / `style.css` | Consola de Control (UI del operador). |
| `output.html` / `output.js` | Salida barra inferior (lower-third). |
| `display.html` / `display.js` | Salida pantalla grande (marcador estilo estadio). Dos inputs para Resolume: `output.html` y `display.html`, ambos con fondo transparente. |
| `bridge.js` | Puente WebSocket opcional para Stream Deck (Node, sin dependencias). |
| `README.md` | Documentación de uso para el usuario final. |

## Convenciones y arquitectura

- **`engine.js` es la única fuente de verdad de la lógica.** Las funciones de puntuación/reloj
  reciben el objeto `match` y lo **mutan** (no devuelven copia). No metas lógica de reglas en `control.js`.
- **Estado = objeto `match`** (ver `createMatch`): `{ sport, A, B, period, serving, possession,
  tiebreak, finished, setHistory, clock, onAir }`. Cada equipo: `{ name, short, color, logo, score,
  fouls, yellow, red, games, sets, point, adv }`.
- **Sincronización Control → Salida**: `publish(match)` guarda en `localStorage["mm_match"]` y emite
  por `BroadcastChannel("mm_sync")`. La Salida escucha el canal + evento `storage` y redibuja.
  No añadas otro mecanismo; usa `publish()`.
- **Fondo personalizado** (solo pantalla grande): global, en `localStorage["mm_bg"]` vía
  `saveBg()`/`loadBg()` de `engine.js`; emite `{type:"bg"}` por el mismo canal. Solo se aplica en
  `display.html?bg=custom`. Modelo: `{ color, image, gallery }`. Prioridad **galería › imagen › color**.
  La **galería** (`{ enabled, auto, intervalSec, index, dir, files }`) descubre las fotos de `fondos/`
  desde el Control (parsea el listado del `http.server`, con respaldo a `fondos/list.json`) y **solo
  guarda los nombres**; el display las carga por URL (`dir+file`) y rota solo si `auto`. La imagen
  subida se guarda como JPEG para no inflar `localStorage`.
- **Reloj**: se guarda `{ running, accumMs, lastStart, addedMin }`. El tiempo se **calcula** con
  `elapsed()` desde `lastStart`; así ambas pantallas avanzan sin enviar mensajes por segundo.
  El tick (cada 200 ms) solo actualiza el texto (`tickClock`), no redibuja (evita recargar logos).
- **Config por deporte**: base en `SPORTS`, con overrides del usuario en `localStorage["mm_cfg_<sport>"]`
  vía `resolveCfg()` / `saveCfgOverride()`. `feat` (fouls/cards/added/serving/possession) define qué
  controles y elementos aparecen — respétalo al renderizar.
- **Comando central**: toda acción del operador pasa por el registro `COMMANDS` de `control.js`.
  Teclado, MIDI y WebSocket (Stream Deck) despachan a `runCommand(id)`. **Si añades una acción nueva,
  regístrala en `COMMANDS` y en `COMMAND_LIST`** (esto último alimenta la tabla de atajos y MIDI Learn).
- **Cambios de estado**: usa `apply(mutator, undoable)` en `control.js` (gestiona pila de undo +
  `sync()`). No mutes `match` y llames a `publish` por separado.
- `scoreLabel`, `periodLabel`, `clockText`, `addedText` viven en `engine.js`: úsalas, no reimplementes.
- Sin frameworks ni dependencias en el front. **No introducir librerías** salvo petición explícita.

## Control externo (Stream Deck / MIDI)

- **Stream Deck simple**: acción *Hotkey* con los atajos de `KEYMAP`/`COMMAND_LIST`.
- **Stream Deck avanzado**: `node bridge.js` (HTTP `GET /cmd/<id>` → reenvía por WS a la app, que se
  conecta a `ws://localhost:9000`). El front es **cliente** WS, el bridge es **servidor**.
- **MIDI**: Web MIDI API con asignación por aprendizaje; bindings en `localStorage["mm_midi"]`.

## Notas de estado / pendientes

- La verificación en navegador con la extensión de Chrome estaba **pendiente** (la extensión no
  enlazaba con Claude Code). Al reabrir con la extensión activa: abrir el Control, probar marcar en
  cada deporte, subir un logo, activar EN AIRE y revisar la consola por errores.
- Idiomas/strings de UI en **español**.
