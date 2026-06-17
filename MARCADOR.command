#!/bin/bash
# Multi-Marcador · Broadcast — Lanzador (macOS / Linux)
# Doble clic para arrancar el servidor y abrir el Control.

cd "$(dirname "$0")" || exit 1

PORT=8080
# Si el puerto está ocupado, busca el siguiente libre.
while lsof -i ":$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

# Elige python disponible.
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "ERROR: No se encontró Python. Instálalo desde https://www.python.org/downloads/"
  read -n 1 -s -r -p "Pulsa cualquier tecla para salir..."
  exit 1
fi

URL="http://localhost:$PORT/index.html"

echo "Multi-Marcador · Broadcast"
echo "Servidor en $URL"
echo "Salida (OBS): http://localhost:$PORT/output.html"
echo "Pantalla grande: http://localhost:$PORT/display.html"
echo ""
echo "Cierra esta ventana para detener el servidor."

# Arranca el servidor en segundo plano y abre el navegador.
"$PY" -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!

# Detiene el servidor al cerrar.
trap "kill $SERVER_PID 2>/dev/null" EXIT

sleep 1
if command -v open >/dev/null 2>&1; then
  open "$URL"            # macOS
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"       # Linux
fi

wait $SERVER_PID
