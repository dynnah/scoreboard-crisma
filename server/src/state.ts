import { randomUUID } from "crypto";
import { basename, join } from "path";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { DEFAULT_TIMER_SEC, STARTING_SCORE, TEAM_COLOR_PALETTE } from "./rules";
import { UPLOADS_DIR } from "./uploads";

export type HistoryKind =
  | "correct"
  | "incorrect"
  | "no-answer"
  | "accusation-penalty"
  | "accusation-reward"
  | "free";

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  eventId: string;
  teamId: string;
  teamName: string;
  delta: number;
  reason: string;
  kind: HistoryKind;
  timestamp: number;
}

export type TimerStatus = "idle" | "running" | "paused" | "ended";

export interface TimerState {
  durationMs: number;
  remainingAtStart: number;
  startedAt: number | null;
  status: TimerStatus;
}

export type QuestionKind = "texto" | "multipla-escolha" | "verdadeiro-falso" | "imagem";

export interface Question {
  id: string;
  kind: QuestionKind;
  label: string | null;
  prompt: string;
  options: string[];
  correctOptionIndex: number | null;
  imageUrl: string | null;
  createdAt: number;
}

export interface QuestionsState {
  items: Question[];
  activeQuestionId: string | null;
  revealed: boolean;
}

export interface AppState {
  teams: Team[];
  history: HistoryEntry[];
  timer: TimerState;
  questions: QuestionsState;
  startingScore: number;
  gameEnded: boolean;
  updatedAt: number;
}

const DATA_FILE = join(__dirname, "..", "placar.json");

function freshState(): AppState {
  const durationMs = DEFAULT_TIMER_SEC * 1000;
  return {
    teams: [],
    history: [],
    timer: {
      durationMs,
      remainingAtStart: durationMs,
      startedAt: null,
      status: "idle",
    },
    questions: { items: [], activeQuestionId: null, revealed: false },
    startingScore: STARTING_SCORE,
    gameEnded: false,
    updatedAt: Date.now(),
  };
}

function load(): AppState {
  if (existsSync(DATA_FILE)) {
    try {
      const raw = readFileSync(DATA_FILE, "utf-8");
      const loaded = JSON.parse(raw) as AppState;
      // Compatibilidade com placar.json salvo antes da feature de perguntas
      // (ou antes do campo de resposta correta/revelação ser adicionado).
      if (!loaded.questions) {
        loaded.questions = { items: [], activeQuestionId: null, revealed: false };
      } else {
        loaded.questions.revealed = loaded.questions.revealed ?? false;
        loaded.questions.items = loaded.questions.items.map((q) => ({
          ...q,
          correctOptionIndex: q.correctOptionIndex ?? null,
        }));
      }
      // Compatibilidade com placar.json salvo antes da pontuação inicial
      // ser configurável — cai no valor padrão de rules.ts.
      if (typeof loaded.startingScore !== "number") {
        loaded.startingScore = STARTING_SCORE;
      }
      return loaded;
    } catch {
      return freshState();
    }
  }
  return freshState();
}

let state: AppState = load();
let endTimeout: ReturnType<typeof setTimeout> | null = null;
let onTimerEnded: (() => void) | null = null;

export function setOnTimerEnded(cb: () => void): void {
  onTimerEnded = cb;
}

function persist(): void {
  state.updatedAt = Date.now();
  writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function getState(): AppState {
  return state;
}

function pickColor(): string {
  const used = new Set(state.teams.map((t) => t.color));
  const available = TEAM_COLOR_PALETTE.find((c) => !used.has(c.hex));
  if (available) return available.hex;
  // Paleta esgotada (mais de 8 equipes): reinicia o ciclo de cores.
  return TEAM_COLOR_PALETTE[state.teams.length % TEAM_COLOR_PALETTE.length].hex;
}

export function addTeam(name: string): Team {
  const team: Team = {
    id: randomUUID(),
    name: name.trim(),
    color: pickColor(),
    score: state.startingScore,
    createdAt: Date.now(),
  };
  state.teams.push(team);
  persist();
  return team;
}

export function setStartingScore(value: number): void {
  if (!Number.isFinite(value)) return;
  state.startingScore = Math.round(value);
  persist();
}

export function removeTeam(teamId: string): void {
  state.teams = state.teams.filter((t) => t.id !== teamId);
  persist();
}

function pushEntry(
  eventId: string,
  team: Team,
  delta: number,
  reason: string,
  kind: HistoryKind,
): void {
  team.score += delta;
  const entry: HistoryEntry = {
    id: randomUUID(),
    eventId,
    teamId: team.id,
    teamName: team.name,
    delta,
    reason,
    kind,
    timestamp: Date.now(),
  };
  state.history.unshift(entry);
}

export function applyScoreDelta(
  teamId: string,
  delta: number,
  reason: string,
  kind: HistoryKind,
): void {
  const team = state.teams.find((t) => t.id === teamId);
  if (!team || !Number.isFinite(delta) || delta === 0) return;
  const eventId = randomUUID();
  pushEntry(eventId, team, delta, reason || "Pontuação livre", kind);
  persist();
}

// Regra da denúncia: transfere 20 pontos da equipe flagrada para a
// equipe que denunciou. Dois lançamentos distintos, um único evento
// (desfazer reverte os dois juntos).
export function applyAccusation(flaggedTeamId: string, accuserTeamId: string): void {
  if (flaggedTeamId === accuserTeamId) return;
  const flagged = state.teams.find((t) => t.id === flaggedTeamId);
  const accuser = state.teams.find((t) => t.id === accuserTeamId);
  if (!flagged || !accuser) return;

  const eventId = randomUUID();
  pushEntry(
    eventId,
    flagged,
    -20,
    `Flagrada colando (denunciada por ${accuser.name})`,
    "accusation-penalty",
  );
  pushEntry(
    eventId,
    accuser,
    20,
    `Denunciou ${flagged.name} colando`,
    "accusation-reward",
  );
  persist();
}

export function undoLast(): void {
  if (state.history.length === 0) return;
  const lastEventId = state.history[0].eventId;
  const toUndo = state.history.filter((e) => e.eventId === lastEventId);
  for (const entry of toUndo) {
    const team = state.teams.find((t) => t.id === entry.teamId);
    if (team) team.score -= entry.delta;
  }
  state.history = state.history.filter((e) => e.eventId !== lastEventId);
  persist();
}

const QUESTION_KINDS: QuestionKind[] = ["texto", "multipla-escolha", "verdadeiro-falso", "imagem"];

export function addQuestion(input: {
  kind?: QuestionKind;
  label?: string;
  prompt?: string;
  options?: string[];
  correctOptionIndex?: number;
  imageUrl?: string;
}): Question | null {
  if (!input?.kind || !QUESTION_KINDS.includes(input.kind)) return null;

  const prompt = (input.prompt ?? "").trim();
  if (input.kind !== "imagem" && !prompt) return null;
  if (input.kind === "imagem" && !input.imageUrl) return null;

  let options: string[] = [];
  let correctOptionIndex: number | null = null;
  if (input.kind === "multipla-escolha") {
    options = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) return null;
    // Sem uma alternativa correta marcada não tem o que revelar no Telão
    // depois — melhor recusar a pergunta aqui do que descobrir isso ao vivo.
    if (
      typeof input.correctOptionIndex !== "number" ||
      !Number.isInteger(input.correctOptionIndex) ||
      input.correctOptionIndex < 0 ||
      input.correctOptionIndex >= options.length
    ) {
      return null;
    }
    correctOptionIndex = input.correctOptionIndex;
  }
  if (input.kind === "verdadeiro-falso") {
    // Reaproveita correctOptionIndex pro V/F: 0 = Verdadeiro, 1 = Falso —
    // mesmo motivo do bloco acima, sem isso não tem o que revelar depois.
    if (input.correctOptionIndex !== 0 && input.correctOptionIndex !== 1) return null;
    correctOptionIndex = input.correctOptionIndex;
  }

  const question: Question = {
    id: randomUUID(),
    kind: input.kind,
    label: input.label?.trim() || null,
    prompt,
    options,
    correctOptionIndex,
    imageUrl: input.kind === "imagem" ? input.imageUrl! : null,
    createdAt: Date.now(),
  };
  state.questions.items.push(question);
  persist();
  return question;
}

export function removeQuestion(questionId: string): void {
  const question = state.questions.items.find((q) => q.id === questionId);
  if (!question) return;
  state.questions.items = state.questions.items.filter((q) => q.id !== questionId);
  if (state.questions.activeQuestionId === questionId) {
    state.questions.activeQuestionId = null;
  }
  if (question.imageUrl) {
    try {
      unlinkSync(join(UPLOADS_DIR, basename(question.imageUrl)));
    } catch {
      // Arquivo já pode não existir — não é motivo pra falhar a remoção.
    }
  }
  persist();
}

export function showQuestion(questionId: string): void {
  if (!state.questions.items.some((q) => q.id === questionId)) return;
  state.questions.activeQuestionId = questionId;
  state.questions.revealed = false;
  persist();
}

export function hideQuestion(): void {
  state.questions.activeQuestionId = null;
  state.questions.revealed = false;
  persist();
}

export function revealAnswer(): void {
  if (!state.questions.activeQuestionId) return;
  state.questions.revealed = true;
  persist();
}

function clearEndTimeout(): void {
  if (endTimeout) {
    clearTimeout(endTimeout);
    endTimeout = null;
  }
}

function armEndTimeout(remainingMs: number): void {
  clearEndTimeout();
  endTimeout = setTimeout(() => {
    state.timer.status = "ended";
    state.timer.remainingAtStart = 0;
    state.timer.startedAt = null;
    persist();
    onTimerEnded?.();
  }, Math.max(remainingMs, 0));
}

export function setTimerDuration(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  clearEndTimeout();
  const durationMs = Math.round(seconds) * 1000;
  state.timer = { durationMs, remainingAtStart: durationMs, startedAt: null, status: "idle" };
  persist();
}

export function startTimer(): void {
  if (state.timer.status === "running") return;
  if (state.timer.status === "ended" || state.timer.remainingAtStart <= 0) {
    state.timer.remainingAtStart = state.timer.durationMs;
  }
  state.timer.startedAt = Date.now();
  state.timer.status = "running";
  armEndTimeout(state.timer.remainingAtStart);
  persist();
}

export function pauseTimer(): void {
  if (state.timer.status !== "running") return;
  const elapsed = Date.now() - (state.timer.startedAt ?? Date.now());
  state.timer.remainingAtStart = Math.max(0, state.timer.remainingAtStart - elapsed);
  state.timer.startedAt = null;
  state.timer.status = "paused";
  clearEndTimeout();
  persist();
}

export function resetTimer(): void {
  clearEndTimeout();
  state.timer.remainingAtStart = state.timer.durationMs;
  state.timer.startedAt = null;
  state.timer.status = "idle";
  persist();
}

export function resetAll(): void {
  clearEndTimeout();
  // "Reiniciar tudo" zera o banco de perguntas junto — inclusive apagando as
  // imagens enviadas, senão ficam órfãs em server/uploads/ pra sempre.
  for (const question of state.questions.items) {
    if (question.imageUrl) {
      try {
        unlinkSync(join(UPLOADS_DIR, basename(question.imageUrl)));
      } catch {
        // Arquivo já pode não existir — não é motivo pra travar o reset.
      }
    }
  }
  state = freshState();
  persist();
}

export function endGame(): void {
  state.gameEnded = true;
  persist();
}

export function resumeGame(): void {
  state.gameEnded = false;
  persist();
}

// Recuperação após queda do processo: como o cronômetro é calculado a
// partir de timestamps absolutos, um cronômetro em execução pode
// continuar exatamente de onde parou, sem perder precisão.
function reconcileTimerOnBoot(): void {
  if (state.timer.status === "running" && state.timer.startedAt) {
    const remaining = state.timer.remainingAtStart - (Date.now() - state.timer.startedAt);
    if (remaining <= 0) {
      state.timer.status = "ended";
      state.timer.remainingAtStart = 0;
      state.timer.startedAt = null;
    } else {
      armEndTimeout(remaining);
    }
  }
}
reconcileTimerOnBoot();
