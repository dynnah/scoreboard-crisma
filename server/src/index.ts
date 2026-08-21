import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import * as store from "./state";
import type { HistoryKind } from "./state";
import { authEnabled, isAuthorized } from "./auth";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
  allowRequest: (req, callback) => {
    if (!authEnabled || isAuthorized(req.headers.authorization)) {
      callback(null, true);
    } else {
      callback("unauthorized", false);
    }
  },
});

if (authEnabled) {
  app.use((req, res, next) => {
    if (isAuthorized(req.headers.authorization)) return next();
    res.set("WWW-Authenticate", 'Basic realm="Gincana da Crisma"');
    res.status(401).send("Autenticação necessária.");
  });
}

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
// Fallback de SPA: qualquer rota não encontrada (ex: /telao) recebe o
// index.html e o React decide a view pelo pathname no navegador.
app.use((_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

function broadcast(): void {
  // serverNow deixa o cliente medir o desvio entre o relógio dele e o do
  // servidor, já que o cronômetro é calculado a partir de Date.now() dos
  // dois lados — sem isso, um relógio desregulado faz a contagem exibida
  // ficar adiantada ou atrasada enquanto o timer roda.
  io.emit("state:sync", { ...store.getState(), serverNow: Date.now() });
}

store.setOnTimerEnded(broadcast);

io.on("connection", (socket) => {
  socket.emit("state:sync", store.getState());

  socket.on("team:add", (payload: { name?: string }) => {
    if (!payload?.name?.trim()) return;
    store.addTeam(payload.name);
    broadcast();
  });

  socket.on("team:remove", (payload: { teamId?: string }) => {
    if (!payload?.teamId) return;
    store.removeTeam(payload.teamId);
    broadcast();
  });

  socket.on(
    "score:delta",
    (payload: { teamId?: string; delta?: number; reason?: string; kind?: HistoryKind }) => {
      if (!payload?.teamId || typeof payload.delta !== "number") return;
      store.applyScoreDelta(payload.teamId, payload.delta, payload.reason ?? "", payload.kind ?? "free");
      broadcast();
    },
  );

  socket.on(
    "score:accusation",
    (payload: { flaggedTeamId?: string; accuserTeamId?: string }) => {
      if (!payload?.flaggedTeamId || !payload?.accuserTeamId) return;
      store.applyAccusation(payload.flaggedTeamId, payload.accuserTeamId);
      broadcast();
    },
  );

  socket.on("history:undo", () => {
    store.undoLast();
    broadcast();
  });

  socket.on("timer:setDuration", (payload: { seconds?: number }) => {
    if (typeof payload?.seconds !== "number") return;
    store.setTimerDuration(payload.seconds);
    broadcast();
  });

  socket.on("timer:start", () => {
    store.startTimer();
    broadcast();
  });

  socket.on("timer:pause", () => {
    store.pauseTimer();
    broadcast();
  });

  socket.on("timer:reset", () => {
    store.resetTimer();
    broadcast();
  });

  socket.on("system:resetAll", () => {
    store.resetAll();
    broadcast();
  });

  socket.on("game:end", () => {
    store.endGame();
    broadcast();
  });

  socket.on("game:resume", () => {
    store.resumeGame();
    broadcast();
  });
});

httpServer.listen(PORT, () => {
  console.log(`Placar da Gincana rodando em http://localhost:${PORT}`);
});
