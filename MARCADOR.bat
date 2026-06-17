@echo off
REM Multi-Marcador . Broadcast — Lanzador (Windows)
REM Doble clic para arrancar el servidor y abrir el Control.

cd /d "%~dp0"

set PORT=8080

REM Elige python disponible.
where python >nul 2>&1
if %errorlevel%==0 (
  set PY=python
) else (
  where py >nul 2>&1
  if %errorlevel%==0 (
    set PY=py
  ) else (
    echo ERROR: No se encontro Python. Instalalo desde https://www.python.org/downloads/
    echo Marca "Add Python to PATH" durante la instalacion.
    pause
    exit /b 1
  )
)

echo Multi-Marcador . Broadcast
echo Servidor en http://localhost:%PORT%/index.html
echo Salida (OBS): http://localhost:%PORT%/output.html
echo Pantalla grande: http://localhost:%PORT%/display.html
echo.
echo Cierra esta ventana para detener el servidor.

REM Abre el navegador tras un instante y arranca el servidor.
start "" http://localhost:%PORT%/index.html
%PY% -m http.server %PORT%
