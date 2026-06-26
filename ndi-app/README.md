# Marcador · App de escritorio (Control + salida NDI)

Un **único ejecutable** (Windows / macOS / Linux) que al abrirlo levanta **todo**:

- la **consola de Control** como ventana principal,
- un servidor interno (los módulos ES necesitan HTTP),
- y la emisión de **fuentes NDI con transparencia (alfa)** para Resolume.

Sin OBS, sin terminal, sin `python http.server`. Internamente: Electron sirve el
proyecto, muestra `index.html` (Control) y, en segundo plano, renderiza las
salidas (`display.html` / `output.html`) en ventanas offscreen transparentes y
las manda por NDI con
[`@stagetimerio/grandiose`](https://www.npmjs.com/package/@stagetimerio/grandiose).

```
[ App Marcador ]
   ├─ Control (ventana)         ─┐  comparten origen
   ├─ display.html (offscreen) ──┤→ se sincronizan solas (publish/BroadcastChannel)
   └─ output.html  (offscreen) ─┘
        └─► NDI: "Marcador · Pantalla"  +  "Marcador · Barra"  ─► Resolume (capas)
```

## Usar el ejecutable (usuario final)

1. Abre la app. Verás la **consola de Control**.
2. En **Resolume** aparecen dos fuentes **NDI**: `Marcador · Pantalla` y
   `Marcador · Barra`. Pon la que quieras (o ambas) en **capas superiores**,
   blend **Normal/Alpha**. El fondo se ve por la transparencia. ✅
3. Cierra la ventana de Control para salir (se apaga el NDI).

> ¿Controlar desde otro dispositivo? La app deja un relay en `ws://127.0.0.1:9011`;
> el front se conecta solo. (Acceso desde otra máquina queda para más adelante.)

## Desarrollo

Requiere Node 18+ y, para compilar el módulo NDI, herramientas de build
(macOS: `xcode-select --install`; Windows: VS Build Tools "Desktop C++";
Linux: `build-essential`). Internet en el primer `npm install` (baja el SDK de NDI).

```bash
cd ndi-app
npm install
npm start          # abre Control + emite NDI (usa el repo de al lado como web)
```

## Generar ejecutables

Cada SO se compila **en su propia plataforma** (el módulo NDI es nativo, no se
cross-compila). En cada máquina:

```bash
cd ndi-app
npm install
npm run dist        # detecta el SO y crea el instalador en ndi-app/dist/
# o explícito: npm run dist:mac | dist:win | dist:linux
```

Salidas: `.dmg`/`.zip` (Mac), `.exe` NSIS + portable (Windows), `.AppImage` (Linux).

### Los 3 a la vez (CI)

`.github/workflows/build.yml` compila Mac/Windows/Linux en GitHub Actions y sube
los instaladores como *artifacts*. Se dispara a mano (pestaña **Actions** →
*Run workflow*) o al crear un tag `vX.Y.Z`.

## Configuración — `config.json`

Cada elemento de `outputs` genera **una fuente NDI** independiente.

```json
{
  "outputs": [
    { "page": "display.html", "name": "Marcador · Pantalla", "width": 1920, "height": 1080, "fps": 60 },
    { "page": "output.html",  "name": "Marcador · Barra",    "width": 1920, "height": 1080, "fps": 60 }
  ],
  "httpPort": 8099,
  "wsPort": 9011,
  "unpremultiply": true
}
```

| Clave | Qué hace |
|---|---|
| `outputs[].page` | `display.html` (grande) u `output.html` (barra). |
| `outputs[].name` | Nombre de la fuente NDI en Resolume. |
| `outputs[].width` / `height` / `fps` | Resolución y cadencia de esa fuente. |
| `httpPort` | Puerto interno del servidor (def. `8099`). |
| `wsPort` | Puerto del relay; debe coincidir con `control.js` (def. `9011`). |
| `unpremultiply` | Corrige el alfa premultiplicado (bordes/sombras). Def. `true`. |

## Iconos

El icono del ejecutable es `build/icon.png` (cuadrado **1024×1024**, mínimo 512×512).
electron-builder lo detecta solo y genera el `.icns` (macOS), `.ico` (Windows) y el de Linux.
Si lo cambias, basta reemplazar ese archivo y volver a empaquetar.

## Problemas frecuentes

- **No aparece la fuente NDI** → suele ser el runtime de NDI; verifica con
  *NDI Studio Monitor*. En consola debe leerse `[ndi] emitiendo: "..."`.
- **Transparente pero "Esperando…"** → el Control aún no ha publicado estado
  (marca algo). 
- **Frame en negro / no actualiza** → algunos equipos necesitan
  `app.disableHardwareAcceleration()` al inicio de `main.js`.
- **Bordes oscuros sobre el fondo** → mantén `unpremultiply: true`.
