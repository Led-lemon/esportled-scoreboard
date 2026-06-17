/* ============================================================
   Puente Stream Deck → Multi-Marcador  (OPCIONAL / AVANZADO)
   ------------------------------------------------------------
   Sin dependencias. Requiere Node.js.
   Arranca un servidor que:
     · HTTP  GET  http://localhost:9000/cmd/<comando>
              → reenvía <comando> a la app por WebSocket
     · WS    ws://localhost:9000
              → la app se conecta aquí y recibe los comandos

   Uso:
     1) node bridge.js
     2) En la app: Configuración → Stream Deck (WebSocket)
        → escribe  ws://localhost:9000  → Conectar
     3) En Stream Deck usa un plugin de peticiones web
        (p. ej. "BarRaider Web Requests" o "API Ninja")
        y crea botones que hagan GET a:
          http://localhost:9000/cmd/a_plus
          http://localhost:9000/cmd/b_plus
          http://localhost:9000/cmd/clock_toggle   ... etc.

   NOTA: Si no quieres complicarte, NO necesitas esto.
   La forma más simple para Stream Deck es la acción "Hotkey"
   con los atajos de teclado (ver README.md).
   ============================================================ */

const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 9000;
const clients = new Set();

// Codifica un frame WebSocket de texto (servidor → cliente, sin máscara).
function wsFrame(str) {
  const payload = Buffer.from(str);
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
  } else {
    header = Buffer.from([0x81, 127, 0, 0, 0, 0, (len >>> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  }
  return Buffer.concat([header, payload]);
}

function broadcast(cmd) {
  const frame = wsFrame(JSON.stringify({ cmd }));
  for (const sock of clients) {
    try { sock.write(frame); } catch { clients.delete(sock); }
  }
  return clients.size;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const m = req.url.match(/^\/cmd\/([a-z0-9_]+)/i);
  if (m) {
    const n = broadcast(m[1]);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`OK ${m[1]} → ${n} cliente(s)\n`);
    console.log(`▶ ${m[1]}  (${n} app conectada/s)`);
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Puente Multi-Marcador activo.\nUsa /cmd/<comando>, ej: /cmd/a_plus\n");
});

// Manejo del upgrade a WebSocket (handshake RFC6455).
server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) { socket.destroy(); return; }
  const accept = crypto
    .createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
  );
  clients.add(socket);
  console.log(`✅ App conectada (${clients.size} en total)`);
  socket.on("close", () => { clients.delete(socket); });
  socket.on("error", () => { clients.delete(socket); });
  socket.on("data", () => {}); // ignoramos lo que envíe el cliente
});

server.listen(PORT, () => {
  console.log(`🟢 Puente Multi-Marcador en http://localhost:${PORT}`);
  console.log(`   App → WebSocket:  ws://localhost:${PORT}`);
  console.log(`   Stream Deck → GET http://localhost:${PORT}/cmd/<comando>`);
});
