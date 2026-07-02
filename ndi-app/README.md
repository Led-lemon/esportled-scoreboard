# Marcador NDI

App de escritorio Electron para usar EsportLed Scoreboard sin abrir un servidor manual y con salidas
NDI con alfa para Resolume.

## Requisitos

- Node.js 22 o superior recomendado.
- NDI runtime/disponibilidad de red local compatible con `@stagetimerio/grandiose`.
- macOS, Windows o Linux para empaquetar en cada plataforma.

## Desarrollo

Desde esta carpeta:

```bash
npm install
npm start
```

En desarrollo, `main.js` sirve como raíz web la carpeta superior del repo. No copies aquí los HTML,
CSS o JS del front: la app usa la misma fuente que la web.

## Que hace

Al arrancar:

1. Sirve el proyecto por HTTP local en `http://127.0.0.1:8099`.
2. Abre `index.html` como ventana principal de Control.
3. Abre un relay WebSocket en `ws://127.0.0.1:9011`.
4. Carga `display.html` y `output.html` en ventanas offscreen transparentes.
5. Captura frames BGRA y emite dos fuentes NDI:
   - `Marcador · Pantalla`
   - `Marcador · Barra`

La configuración de salidas vive en `config.json`.

## Build

```bash
npm run build
```

Atajos por plataforma:

```bash
npm run build:mac
npm run build:win
npm run build:linux
```

Los instaladores se generan en `ndi-app/dist/`. Esa carpeta esta ignorada en git.

## Archivos versionados

| Archivo | Uso |
|---|---|
| `main.js` | App Electron, servidor local, relay WebSocket, ventanas offscreen y emisión NDI |
| `config.json` | Salidas NDI, puertos y resolución/fps |
| `package.json` | Dependencias, scripts y configuración de electron-builder |

## No versionar

- `node_modules/`
- `dist/`
- `build/`
- `.dmg`, `.exe`, `.msi`, `.AppImage`, `.deb`, `.rpm`, `.pkg`
- `.asar`, `.blockmap`
