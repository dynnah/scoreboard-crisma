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
