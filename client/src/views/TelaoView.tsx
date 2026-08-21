import { useEffect, useState } from "react";
import { useSocketState } from "../hooks/useSocketState";
import { computeRemainingMs, formatMs } from "../components/TimerControl";
import { QuestionDisplay } from "../components/QuestionDisplay";
import { TrophyIcon } from "../components/TrophyIcon";
import { WinnerAnnouncement } from "../components/WinnerAnnouncement";
import { RANK_COLOR_CLASS, RANK_LABELS, medalFor, rankTeams } from "../utils/ranking";

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
  const { state, connected, clockOffsetMs } = useSocketState();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);

  if (!state) {
    return <div className="telao-view telao-view--loading">Conectando ao servidor...</div>;
  }

  // Diferente do painel do admin (onde a ordem fica fixa pra facilitar achar
  // o time certo enquanto pontua): no Telão as linhas seguem a colocação ao
  // vivo, pra quem está assistindo acompanhar a disputa subindo/descendo.
  const sortedTeams = [...state.teams].sort((a, b) => b.score - a.score);
  const ranks = rankTeams(sortedTeams);
  const remainingMs = computeRemainingMs(state.timer, clockOffsetMs);
  const isZero = state.timer.status === "ended" || remainingMs <= 0;
  const activeQuestion =
    state.questions.items.find((q) => q.id === state.questions.activeQuestionId) ?? null;

  // O cronômetro fica visível tanto no placar normal quanto durante uma
  // pergunta — enquanto a prova rola tem tempo de resposta/ação correndo,
  // então some só na tela de vencedor (onde o jogo já acabou). Durante a
  // pergunta ele encolhe pra um canto, deixando o card ocupar o centro.
  const timerBlock = (
    <div className={`telao-view__timer-block${activeQuestion ? " telao-view__timer-block--compact" : ""}`}>
      <div className="telao-view__timer-label">
        <ClockIcon /> Cronômetro
      </div>
      <div className={`telao-view__timer${isZero ? " telao-view__timer--zero" : ""}`}>
        {formatMs(remainingMs)}
      </div>
    </div>
  );

  return (
    <div className="telao-view">
      <header className="telao-view__header">
        <img src="/logo.png" alt="" className="telao-view__logo" />
        <h1>{!state.gameEnded && activeQuestion ? "Hora da Disputa" : "Placar da Disputa"}</h1>
        {!connected && <span className="telao-view__offline-badge">Reconectando...</span>}
      </header>

      {state.gameEnded ? (
        <WinnerAnnouncement teams={state.teams} />
      ) : activeQuestion ? (
        <>
          {timerBlock}
          <QuestionDisplay question={activeQuestion} revealed={state.questions.revealed} />
        </>
      ) : (
        <>
          {timerBlock}

          <ol className="telao-view__scoreboard">
            {sortedTeams.map((team) => {
              const rank = ranks.get(team.id) ?? 0;
              const medal = medalFor(team, rank);
              const medalClass = medal ? RANK_COLOR_CLASS[medal - 1] : "";
              return (
                <li
                  key={team.id}
                  className={`telao-view__team${medal === 1 ? " telao-view__team--leader" : ""}`}
                  style={{ borderColor: team.color }}
                >
                  <span className="telao-view__team-swatch" style={{ background: team.color }} />
                  <span className="telao-view__team-name">{team.name}</span>
                  {medal && (
                    <span className={`telao-view__rank-badge telao-view__rank-badge--${medalClass}`}>
                      <TrophyIcon className="telao-view__rank-trophy" />
                      {RANK_LABELS[medal - 1]}
                    </span>
                  )}
                  <span className="telao-view__team-score">{team.score}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
