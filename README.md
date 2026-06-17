# Multi-Marcador · Broadcast

Marcador profesional para **Fútbol ⚽ · Baloncesto 🏀 · Vóley 🏐 · Tenis 🎾 · Pádel 🏓**
con arquitectura de **control + salidas** (estilo realización TV):

- **Control** (`index.html`) — consola del operador.
- **Salidas** — dos gráficos con fondo transparente, pensados como **inputs** de Resolume/OBS:
  - `output.html` — barra inferior (*lower-third*).
  - `display.html` — pantalla grande, marcador estilo estadio.

Todas se sincronizan en tiempo real con el Control (mismo navegador / pestañas).

## Cómo abrir

Sírvelo por `localhost` (necesario para módulos ES y MIDI):

```bash
cd /Users/adfelipe/Documents/MARCADOR
python3 -m http.server 8080
```

- Control: <http://localhost:8080/index.html>
- El **Preview** del Control muestra la **pantalla grande** (modo principal) y **🖥️ Abrir salida**
  la abre en ventana. La barra inferior se abre desde **⚙️ → Salidas**.

## Pantalla de Control

- **Preview en vivo** de lo que sale por la salida.
- **Equipos**: nombre, abreviatura, **color** (o **transparente**, para que el panel deje ver el fondo)
  y **logo** personalizado (subes una imagen).
- **Reloj** con periodos/cuartos y, en fútbol, **tiempo añadido** (+1', +2'…).
- Controles de marcador grandes por deporte (goles, +1/+2/+3, faltas, tarjetas, saque, posesión…).
- **EN AIRE / OCULTO**: muestra u oculta el gráfico en la salida con una animación.
- Deshacer, cambiar lados, guardar, reiniciar, historial.
- Cada deporte recuerda su partido.

## Salidas para Resolume / OBS (un servidor, dos inputs, un output)

Un solo servidor (`http.server`) sirve las páginas. En **Resolume** añade cada URL como
fuente **Web** (en OBS: *Origen → Navegador*); todas tienen **fondo transparente**, así Resolume
las compone sobre el vídeo del partido y manda un único output a pantalla/proyector.

| Input | URL | Qué muestra |
|---|---|---|
| Barra inferior | `output.html` | *Lower-third* con logos, colores, reloj y tiempo añadido. |
| Pantalla grande | `display.html` | Marcador estilo estadio: nombres, paneles de color, logos, reloj y tarjetas. |

- Para verlas sueltas en un monitor con fondo, añade `?bg=solid` (p. ej. `display.html?bg=solid`).
- **Fondo personalizado** de la pantalla grande: en **⚙️ → Fondo personalizado** eliges un color, subes
  una imagen, o usas la **galería de la carpeta `fondos/`** (pulsa *Buscar en /fondos*): eliges una foto
  por miniatura o activas **Auto** para que vayan pasando solas cada N segundos. Abres la pantalla con
  `display.html?bg=custom`. Prioridad: galería › imagen › color.
- Desde el Control: **⚙️ → Salidas (Resolume / OBS)** tiene botones para abrir cada una.

## Reglas por deporte

- **Fútbol**: goles, faltas, 🟨🟥, 2 tiempos + prórrogas, cronómetro ascendente y **tiempo añadido**.
- **Baloncesto**: +1/+2/+3, faltas, posesión, 4 cuartos + prórroga, cronómetro descendente.
- **Vóley**: puntos por set, sets, saque automático (side-out), al mejor de 3/5.
- **Tenis**: 0/15/30/40/AD, deuce, juegos, sets, tie-break, al mejor de 1/3/5.
- **Pádel**: como tenis + **punto de oro**.

Ajustables en **⚙️ Reglas y control externo**.

## Control por teclado / Stream Deck

Los atajos del Control son la vía directa para Stream Deck (acción **System → Hotkey**).

| Acción | Tecla | Acción | Tecla |
|---|---|---|---|
| Local +punto | `Q` | Visitante +punto | `P` |
| Local −punto | `A` | Visitante −punto | `L` |
| Local +1/+2/+3 | `1` `2` `3` | Visitante +1/+2/+3 | `8` `9` `0` |
| Local falta | `W` | Visitante falta | `O` |
| Local 🟨 / 🟥 | `E` / `R` | Visitante 🟨 / 🟥 | `I` / `U` |
| Saque local / visitante | `[` / `]` | Reloj play/pausa | `Espacio` |
| Reloj reset | `C` | Periodo + / − | `N` / `B` |
| Tiempo añadido + / − | `+` / `-` | Mostrar/ocultar gráfico | `V` |
| Deshacer | `Z` | Cambiar lados | `S` |
| Guardar | `G` | Reiniciar | `Backspace` |

### Stream Deck — opción avanzada (WebSocket, sin foco de ventana)
1. `node bridge.js`
2. Control → ⚙️ → **Stream Deck (WebSocket)** → `ws://localhost:9000` → Conectar.
3. En Stream Deck, con un plugin de peticiones web, botones que hagan **GET** a
   `http://localhost:9000/cmd/<comando>` (ej. `/cmd/a_plus`, `/cmd/clock_toggle`).

## MIDI

Control → ⚙️ → **Activar MIDI** → **Aprender** junto a una acción → toca un pad/tecla/fader.
Queda asignado (Chrome/Edge).

## IDs de comando (WebSocket / MIDI)

`a_plus a_minus b_plus b_minus a1 a2 a3 b1 b2 b3 a_foul b_foul a_yellow a_red b_yellow b_red`
`serve_a serve_b clock_toggle clock_reset period_next period_prev added_plus added_minus`
`onair undo swap save reset`

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` · `control.js` · `style.css` | Consola de Control |
| `output.html` · `output.js` | Salida barra inferior (*lower-third*) |
| `display.html` · `display.js` | Salida pantalla grande (marcador estilo estadio) |
| `fondos/` | Carpeta de fotos de fondo para la galería de la pantalla grande |
| `scoreboard.js` · `scoreboard.css` | Gráfico broadcast: barra + pantallas grandes (compartido) |
| `engine.js` | Lógica de deportes, reloj y sincronización |
| `bridge.js` | Puente WebSocket opcional para Stream Deck (Node) |
