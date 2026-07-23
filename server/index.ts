import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { Game } from "./game.ts";
import type { ClientMessage, ServerMessage } from "../shared/protocol.ts";

const PORT = Number(process.env.PORT ?? 8787);
const TICK_RATE = 30;
const game = new Game();
const clients = new Map<WebSocket, string>();
const distDirectory = fileURLToPath(new URL("../dist", import.meta.url));

const httpServer = createServer((request, response) => {
  if (process.env.NODE_ENV === "production") {
    serveStatic(request.url ?? "/", response);
  } else {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, players: game.players.size }));
  }
});

const webSocketServer = new WebSocketServer({ server: httpServer, path: "/ws" });

webSocketServer.on("connection", (socket) => {
  const id = crypto.randomUUID();
  clients.set(socket, id);
  game.addPlayer(id, "Player");
  send(socket, { type: "welcome", id });

  socket.on("message", (buffer) => {
    try {
      const message = JSON.parse(buffer.toString()) as ClientMessage;
      if (message.type === "join") {
        game.removePlayer(id);
        game.addPlayer(id, message.name);
      } else if (message.type === "input") {
        game.setInput(id, message.input);
      }
    } catch {
      send(socket, { type: "notice", text: "消息格式无效" });
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
    game.removePlayer(id);
  });
});

let previousTime = performance.now();
setInterval(() => {
  const now = performance.now();
  const deltaSeconds = Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  game.update(deltaSeconds, now);

  const message: ServerMessage = {
    type: "snapshot",
    serverTime: now,
    players: game.snapshot(),
  };
  const payload = JSON.stringify(message);
  for (const socket of clients.keys()) {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  }
}, 1000 / TICK_RATE);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`StickMan server listening on http://0.0.0.0:${PORT}`);
});

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function serveStatic(rawUrl: string, response: ServerResponse): void {
  const pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(distDirectory, safePath);

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distDirectory, "index.html");
  }

  const contentTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json",
  };
  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    "cache-control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(response);
}
