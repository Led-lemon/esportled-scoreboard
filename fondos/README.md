# Full-screen display backgrounds

Drop your **background photos** here (`.jpg`, `.png`, `.webp`, `.gif`, `.avif`, `.svg`).

In the Control: **⚙️ → 🎨 Fondo → Galería → Buscar en /fondos**. They show up as thumbnails: click
one to set it, or enable **Auto** to cycle through them automatically. Turn the background on with the
**Mostrar fondo** switch (off keeps the display transparent for Resolume).

Auto-detection: the app reads the listing of this folder served by `python3 -m http.server` (or by the
desktop app's internal server). If you use another server that does not list directories, create a
`list.json` here with the names:

```json
["stadium.jpg", "sponsor.png", "tournament.webp"]
```
