import { useEffect, useState } from "react";
import { useSocketState } from "../hooks/useSocketState";
import { computeRemainingMs, formatMs } from "../components/TimerControl";
import { LeaderFlame } from "../components/LeaderFlame";
import { WinnerAnnouncement } from "../components/WinnerAnnouncement";

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function TelaoView() {
  const { state, connected } = useSocketState();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);

  if (!state) {
    return <div className="telao-view telao-view--loading">Conectando ao servidor...</div>;
  }

  const sortedTeams = [...state.teams].sort((a, b) => b.score - a.score);
  const leaderId = sortedTeams[0]?.id;
  const remainingMs = computeRemainingMs(state.timer);
  const isZero = state.timer.status === "ended" || remainingMs <= 0;

  return (
    <div className="telao-view">
      <header className="telao-view__header">
        <img src="/logo.png" alt="" className="telao-view__logo" />
        <h1>Placar da Disputa</h1>
        {!connected && <span className="telao-view__offline-badge">Reconectando...</span>}
      </header>

      {state.gameEnded ? (
        <WinnerAnnouncement teams={state.teams} />
      ) : (
        <>
          <div className="telao-view__timer-block">
            <div className="telao-view__timer-label">
              <ClockIcon /> Cronômetro
            </div>
            <div className={`telao-view__timer${isZero ? " telao-view__timer--zero" : ""}`}>
              {formatMs(remainingMs)}
            </div>
          </div>

          <ol className="telao-view__scoreboard">
            {sortedTeams.map((team) => (
              <li
                key={team.id}
                className={`telao-view__team${team.id === leaderId && team.score > 0 ? " telao-view__team--leader" : ""}`}
                style={{ borderColor: team.color }}
              >
                <span className="telao-view__team-swatch" style={{ background: team.color }} />
                {team.id === leaderId && team.score > 0 && (
                  <span className="telao-view__leader-badge">
                    <LeaderFlame className="telao-view__flame" />
                    Líder
                  </span>
                )}
                <span className="telao-view__team-name">{team.name}</span>
                <span className="telao-view__team-score">{team.score}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
