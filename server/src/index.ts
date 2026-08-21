import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import * as store from "./state";
import type { HistoryKind, QuestionKind } from "./state";
import { authEnabled, isAuthorized } from "./auth";
import { UPLOADS_DIR, upload } from "./uploads";

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
    res.set("WWW-Authenticate", 'Basic realm="Scoreboard Crisma"');
    res.status(401).send("Autenticação necessária.");
  });
}

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.use("/uploads", express.static(UPLOADS_DIR));

app.post("/api/questions/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhuma imagem enviada." });
    return;
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});
// Middleware de erro do multer (tipo não suportado, arquivo grande demais):
// sem isso a rejeição vira uma stack trace HTML em vez de um JSON legível
// pro cliente.
app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    res.status(400).json({ error: err.message || "Falha no upload." });
    return;
  }
  next();
});

// Fallback de SPA: qualquer rota não encontrada (ex: /telao) recebe o
// index.html e o React decide a view pelo pathname no navegador.
app.use((_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// serverNow deixa o cliente medir o desvio entre o relógio dele e o do
// servidor, já que o cronômetro é calculado a partir de Date.now() dos dois
// lados — sem isso, um relógio desregulado faz a contagem exibida ficar
// adiantada ou atrasada enquanto o timer roda.
function syncPayload() {
  return { ...store.getState(), serverNow: Date.now() };
}

function broadcast(): void {
  io.emit("state:sync", syncPayload());
}

store.setOnTimerEnded(broadcast);

io.on("connection", (socket) => {
  socket.emit("state:sync", syncPayload());

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

  socket.on("startingScore:set", (payload: { value?: number }) => {
    if (typeof payload?.value !== "number") return;
    store.setStartingScore(payload.value);
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

  socket.on(
    "question:add",
    (payload: {
      kind?: QuestionKind;
      label?: string;
      prompt?: string;
      options?: string[];
      correctOptionIndex?: number;
      imageUrl?: string;
    }) => {
      store.addQuestion(payload ?? {});
      broadcast();
    },
  );

  socket.on("question:remove", (payload: { questionId?: string }) => {
    if (!payload?.questionId) return;
    store.removeQuestion(payload.questionId);
    broadcast();
  });

  socket.on("question:show", (payload: { questionId?: string }) => {
    if (!payload?.questionId) return;
    store.showQuestion(payload.questionId);
    broadcast();
  });

  socket.on("question:reveal", () => {
    store.revealAnswer();
    broadcast();
  });

  socket.on("question:hide", () => {
    store.hideQuestion();
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
  console.log(`Scoreboard Crisma rodando em http://localhost:${PORT}`);
});
