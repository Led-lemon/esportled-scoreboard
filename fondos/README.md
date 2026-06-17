# Full-screen display backgrounds

Drop your **background photos** here (`.jpg`, `.png`, `.webp`, `.gif`, `.avif`, `.svg`).

In the Control: **⚙️ → 🎨 Fondo personalizado → Buscar en /fondos**. They show up as
thumbnails: click one to set it, or enable **Auto** to cycle through them automatically.
The full-screen display uses them when opened with `display.html?bg=custom`.

Auto-detection: the app reads the listing of this folder served by `python3 -m http.server`.
If you use another server that does not list directories, create a `list.json` here with the names:

```json
["stadium.jpg", "sponsor.png", "tournament.webp"]
```

You can delete the sample images `bg1.svg`–`bg3.svg`.
