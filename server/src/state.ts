import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { DEFAULT_TIMER_SEC, STARTING_SCORE, TEAM_COLOR_PALETTE } from "./rules";

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

export interface AppState {
  teams: Team[];
  history: HistoryEntry[];
  timer: TimerState;
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
    gameEnded: false,
    updatedAt: Date.now(),
  };
}

function load(): AppState {
  if (existsSync(DATA_FILE)) {
    try {
      const raw = readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw) as AppState;
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
    score: STARTING_SCORE,
    createdAt: Date.now(),
  };
  state.teams.push(team);
  persist();
  return team;
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
