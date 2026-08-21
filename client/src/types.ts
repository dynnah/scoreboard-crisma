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
