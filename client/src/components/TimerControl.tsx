import { useEffect, useState } from "react";
import type { TimerState } from "../types";

interface TimerControlProps {
  timer: TimerState;
  presets: readonly number[];
  onSetDuration: (seconds: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

// Cronômetro calculado a partir de timestamps absolutos: o setInterval
// abaixo só força um novo render, nunca decrementa o tempo — por isso
// não há deriva mesmo que o navegador atrase um tick.
export function computeRemainingMs(timer: TimerState): number {
  if (timer.status === "running" && timer.startedAt) {
    return Math.max(0, timer.remainingAtStart - (Date.now() - timer.startedAt));
  }
  return Math.max(0, timer.remainingAtStart);
}

export function formatMs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TimerControl({ timer, presets, onSetDuration, onStart, onPause, onReset }: TimerControlProps) {
  const [, forceTick] = useState(0);
  const [customSeconds, setCustomSeconds] = useState("");

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = setInterval(() => forceTick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [timer.status]);

  const remainingMs = computeRemainingMs(timer);
  const isZero = timer.status === "ended";

  return (
    <div className="timer-control">
      <div className={`timer-control__display${isZero ? " timer-control__display--zero" : ""}`}>
        {formatMs(remainingMs)}
      </div>

      <div className="timer-control__presets">
        {presets.map((sec) => (
          <button key={sec} type="button" onClick={() => onSetDuration(sec)}>
            {sec}s
          </button>
        ))}
        <form
          className="timer-control__custom"
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(customSeconds);
            if (value > 0) onSetDuration(value);
            setCustomSeconds("");
          }}
        >
          <input
            type="number"
            min={1}
            placeholder="Personalizado (s)"
            value={customSeconds}
            onChange={(e) => setCustomSeconds(e.target.value)}
          />
          <button type="submit">Definir</button>
        </form>
      </div>

      <div className="timer-control__buttons">
        <button type="button" onClick={onStart} disabled={timer.status === "running"}>
          Iniciar
        </button>
        <button type="button" onClick={onPause} disabled={timer.status !== "running"}>
          Pausar
        </button>
        <button type="button" onClick={onReset}>
          Zerar
        </button>
      </div>
    </div>
  );
}
