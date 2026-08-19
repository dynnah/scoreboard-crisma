import type { HistoryEntry } from "../types";

interface LogListProps {
  history: HistoryEntry[];
  onUndoLast: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LogList({ history, onUndoLast }: LogListProps) {
  return (
    <div className="log-list">
      <div className="log-list__header">
        <h3>Histórico</h3>
        <button type="button" onClick={onUndoLast} disabled={history.length === 0}>
          Desfazer última ação
        </button>
      </div>
      <ul className="log-list__items">
        {history.map((entry) => (
          <li
            key={entry.id}
            className={`log-list__item log-list__item--${entry.delta >= 0 ? "positive" : "negative"}`}
          >
            <span className="log-list__time">{formatTime(entry.timestamp)}</span>
            <span className="log-list__team">{entry.teamName}</span>
            <span className="log-list__delta">{entry.delta >= 0 ? `+${entry.delta}` : entry.delta}</span>
            <span className="log-list__reason">{entry.reason}</span>
          </li>
        ))}
        {history.length === 0 && <li className="log-list__empty">Nenhum lançamento ainda.</li>}
      </ul>
    </div>
  );
}
