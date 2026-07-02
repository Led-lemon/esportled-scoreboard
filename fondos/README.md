# Fondos para la pantalla grande

Coloca aquí las imágenes de fondo para `display.html`.

Formatos recomendados:

- `.jpg`
- `.png`
- `.webp`
- `.gif`
- `.avif`
- `.svg`

En el Control abre `Configuración -> Fondo -> Galería` y pulsa `Buscar en /fondos`.
Las imágenes aparecen como miniaturas; puedes fijar una o activar el modo automático.

La app intenta leer el listado del directorio servido por `python3 -m http.server`. Si usas otro
servidor que no liste directorios, crea aqui un `list.json`:

```json
["stadium.jpg", "sponsor.png", "tournament.webp"]
```
