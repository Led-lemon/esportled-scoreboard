# EsportLed Scoreboard

Marcador deportivo broadcast para pantallas LED, Resolume, OBS y producción en directo. Forma parte
del ecosistema **EsportLed** de **LedLemon**.

La app está pensada para operar un partido desde una consola de control y enviar gráficos limpios a
una o varias salidas: una barra inferior, una pantalla grande tipo estadio y, opcionalmente, fuentes
NDI con alfa desde la app de escritorio.

## Qué incluye

- Consola de control en español para el operador (`index.html`).
- Barra inferior transparente para OBS/Resolume (`output.html`).
- Marcador a pantalla completa con fondos personalizados (`display.html`).
- App web sin framework, sin build y sin dependencias front.
- App de escritorio Electron opcional con salida NDI (`ndi-app/`).
- Stream Deck por atajos o WebSocket.
- MIDI Learn desde navegadores compatibles.
- Carrusel de sponsors en la salida.
- Historial con guardado y recarga de partidos completos.

## Deportes soportados

| Deporte | Reglas incluidas |
|---|---|
| Fútbol | Goles, faltas, tarjetas, 2 tiempos, prórroga y tiempo añadido |
| Baloncesto | +1/+2/+3, faltas, posesión, cuartos y prórroga |
| Vóley | Puntos, sets, saque automático y mejor de 3/5 |
| Tenis | 0/15/30/40/AD, deuce, juegos, sets y tie-break |
| Pádel | Reglas de tenis con punto de oro configurable |
| Rugby | Ensayo +5, transformación +2, penal/drop +3, tarjetas y tiempo añadido |

## Uso rápido como web app

Sirve la carpeta por HTTP. No abras los HTML con `file://`, porque los módulos ES, MIDI y algunas
partes de sincronización no funcionan bien así.

```bash
cd esportled-scoreboard
python3 -m http.server 8080
```

Abre:

- Control: <http://localhost:8080/index.html>
- Barra inferior: <http://localhost:8080/output.html>
- Pantalla grande: <http://localhost:8080/display.html>

Las salidas son transparentes por defecto. Para verlas con fondo de prueba:

- `output.html?bg=solid`
- `display.html?bg=solid`

El fondo personalizado de la pantalla grande se configura desde el Control en `Configuración -> Fondo`.

## App de escritorio con NDI

La fuente está en `ndi-app/`. Los instaladores y builds generados no se versionan.

```bash
cd ndi-app
npm install
npm start
```

La app:

- sirve el proyecto por HTTP local,
- abre la consola de Control,
- crea un relay WebSocket local en `ws://127.0.0.1:9011`,
- carga las salidas en ventanas offscreen,
- emite fuentes NDI con alfa para Resolume.

Para generar instaladores:

```bash
cd ndi-app
npm run build
```

Los artefactos se generan en `ndi-app/dist/` y quedan ignorados por git.

## Salidas para OBS / Resolume

| Salida | URL | Uso |
|---|---|---|
| Barra inferior | `output.html` | Lower-third con logos, marcador, reloj y sponsors |
| Pantalla grande | `display.html` | Marcador de estadio con nombres, paneles, logos y reloj |

En OBS usa una fuente de navegador. En Resolume usa una fuente Web o las fuentes NDI de la app de
escritorio.

## Fondos y sponsors

Los fondos de la pantalla grande se gestionan desde el Control:

- color sólido,
- imagen subida,
- galería desde la carpeta `fondos/`,
- modo automático con intervalo configurable.

Para la galería, coloca imágenes en `fondos/` y pulsa `Buscar en /fondos`. Si tu servidor no lista
directorios, crea `fondos/list.json` con los nombres de archivo.

Los sponsors se suben desde `Configuración -> Sponsors`. Se guardan en `localStorage` como imágenes
reducidas y se muestran como marquesina en las salidas.

## Atajos y control externo

| Acción | Tecla | Acción | Tecla |
|---|---:|---|---:|
| Local + punto | `Q` | Visitante + punto | `P` |
| Local - punto | `A` | Visitante - punto | `L` |
| Local +1/+2/+3 | `1` `2` `3` | Visitante +1/+2/+3 | `8` `9` `0` |
| Rugby local +2/+3 | `F` / `D` | Rugby visitante +2/+3 | `J` / `K` |
| Local falta | `W` | Visitante falta | `O` |
| Local amarilla/roja | `E` / `R` | Visitante amarilla/roja | `I` / `U` |
| Saque local/visitante | `[` / `]` | Play/pausa reloj | `Space` |
| Reset reloj | `C` | Periodo +/- | `N` / `B` |
| Tiempo añadido +/- | `+` / `-` | Mostrar/ocultar gráfico | `V` |
| Deshacer | `Z` | Cambiar lados | `S` |
| Guardar | `G` | Reiniciar | `Backspace` |

### Stream Deck por WebSocket

```bash
node bridge.js
```

En el Control conecta a `ws://localhost:9000`. Luego envía peticiones HTTP desde Stream Deck:

```text
http://localhost:9000/cmd/a_plus
http://localhost:9000/cmd/b_plus
http://localhost:9000/cmd/clock_toggle
```

Comandos disponibles:

```text
a_plus a_minus b_plus b_minus a1 a2 a3 b1 b2 b3
a_conv a_pen b_conv b_pen
a_foul b_foul a_yellow a_red b_yellow b_red
serve_a serve_b clock_toggle clock_reset period_next period_prev
added_plus added_minus onair undo swap save reset
```

## Estructura

| Ruta | Responsabilidad |
|---|---|
| `engine.js` | Lógica de deportes, reloj, estado, persistencia y sincronización |
| `control.js` | Consola, comandos, teclado, MIDI, WebSocket, fondos, sponsors e historial |
| `scoreboard.js` | Render HTML de barra, pantalla grande y sponsors |
| `scoreboard.css` | Estilos de las salidas broadcast |
| `index.html` / `style.css` | UI de control |
| `output.html` / `output.js` | Salida lower-third |
| `display.html` / `display.js` | Salida pantalla grande |
| `bridge.js` | Puente Stream Deck HTTP -> WebSocket |
| `fondos/` | Imágenes de fondo para la galería |
| `logos/` | Logos de ejemplo y marca |
| `ndi-app/` | Fuente de la app Electron/NDI |

## Desarrollo

No hay build para la web. Para una comprobación rápida de sintaxis:

```bash
node --check engine.js
node --check scoreboard.js
node --check control.js
node --check output.js
node --check display.js
node --check bridge.js
node --check ndi-app/main.js
```

No se suben a git:

- `node_modules/`,
- `ndi-app/dist/`,
- `ndi-app/build/`,
- instaladores `.dmg`, `.exe`, `.msi`, `.AppImage`, `.deb`, `.rpm`, `.pkg`,
- bundles `.asar` y `.blockmap`.

## Licencia

Copyright 2026 RGB LED GROUP S.L.

Este proyecto se distribuye bajo la Apache License, Version 2.0. Consulta
[`LICENSE`](LICENSE) y [`NOTICE`](NOTICE).

---

**EsportLed** · Marcadores y pantallas deportivas para eventos en directo · un proyecto de
**LedLemon**.
