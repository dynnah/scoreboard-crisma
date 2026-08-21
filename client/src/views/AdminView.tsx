import { useState } from "react";
import type { FormEvent } from "react";
import { useSocketState } from "../hooks/useSocketState";
import { TeamCard } from "../components/TeamCard";
import { TimerControl } from "../components/TimerControl";
import { QuestionBank } from "../components/QuestionBank";
import { LogList } from "../components/LogList";
import { medalFor, rankTeams } from "../utils/ranking";
import type { HistoryKind, QuestionKind } from "../types";

const TIMER_PRESETS = [30, 60, 90, 120] as const;

export function AdminView() {
  const { state, connected, socket, clockOffsetMs } = useSocketState();
  const [newTeamName, setNewTeamName] = useState("");
  const [flaggedTeamId, setFlaggedTeamId] = useState("");
  const [accuserTeamId, setAccuserTeamId] = useState("");
  const [startingScoreInput, setStartingScoreInput] = useState("");

  if (!state) {
    return <div className="admin-view admin-view--loading">Conectando ao servidor...</div>;
  }

  // A ordem dos cards fica fixa (ordem de cadastro) mesmo com a pontuação
  // mudando — as medalhas são calculadas por pontuação, mas os cards não
  // pulam de lugar, senão fica difícil achar o time certo pontuando.
  const sortedTeams = [...state.teams].sort((a, b) => b.score - a.score);
  const ranks = rankTeams(sortedTeams);

  const handleAddTeam = (e: FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    socket.emit("team:add", { name: newTeamName.trim() });
    setNewTeamName("");
  };

  const handleSetStartingScore = (e: FormEvent) => {
    e.preventDefault();
    const value = Number(startingScoreInput);
    if (!Number.isFinite(value)) return;
    socket.emit("startingScore:set", { value });
    setStartingScoreInput("");
  };

  const handleRemoveTeam = (teamId: string) => {
    const team = state.teams.find((t) => t.id === teamId);
    if (team && window.confirm(`Remover a equipe "${team.name}"?`)) {
      socket.emit("team:remove", { teamId });
    }
  };

  const handleQuickDelta = (teamId: string, delta: number, reason: string, kind: HistoryKind) => {
    socket.emit("score:delta", { teamId, delta, reason, kind });
  };

  const handleFreeScore = (teamId: string, amount: number, reason: string) => {
    socket.emit("score:delta", { teamId, delta: amount, reason, kind: "free" });
  };

  const handleAccusation = (e: FormEvent) => {
    e.preventDefault();
    if (!flaggedTeamId || !accuserTeamId || flaggedTeamId === accuserTeamId) return;
    socket.emit("score:accusation", { flaggedTeamId, accuserTeamId });
    setFlaggedTeamId("");
    setAccuserTeamId("");
  };

  const handleUndo = () => socket.emit("history:undo");

  const handleResetAll = () => {
    if (
      window.confirm(
        "Reiniciar tudo? Isso zera equipes, pontos, histórico, cronômetro e o banco de perguntas (as imagens enviadas também são apagadas).",
      )
    ) {
      socket.emit("system:resetAll");
    }
  };

  const handleEndGame = () => {
    if (window.confirm("Finalizar o jogo e anunciar a equipe vencedora no Telão?")) {
      socket.emit("game:end");
    }
  };

  const handleResumeGame = () => socket.emit("game:resume");

  const handleAddQuestion = (input: {
    kind: QuestionKind;
    label?: string;
    prompt?: string;
    options?: string[];
    correctOptionIndex?: number;
    imageUrl?: string;
  }) => socket.emit("question:add", input);

  const handleRemoveQuestion = (questionId: string) => socket.emit("question:remove", { questionId });

  const handleShowQuestion = (questionId: string) => socket.emit("question:show", { questionId });

  const handleRevealAnswer = () => socket.emit("question:reveal");

  const handleHideQuestion = () => socket.emit("question:hide");

  return (
    <div className="admin-view">
      <header className="admin-view__header">
        <img src="/logo.png" alt="Logo da Pastoral da Crisma" className="admin-view__logo" />
        <h1>Painel do Administrador</h1>
        <a href="/telao" target="_blank" rel="noopener" className="admin-view__telao-link">
          Abrir Telão ↗
        </a>
        <span className={`admin-view__status admin-view__status--${connected ? "ok" : "down"}`}>
          {connected ? "Conectado" : "Desconectado"}
        </span>
      </header>

      <section className="admin-view__teams">
        <div className="admin-view__starting-score">
          <span>
            Pontuação inicial das novas equipes: <strong>{state.startingScore}</strong>
          </span>
          <form onSubmit={handleSetStartingScore}>
            <input
              type="number"
              placeholder="Novo valor"
              value={startingScoreInput}
              onChange={(e) => setStartingScoreInput(e.target.value)}
            />
            <button type="submit">Definir</button>
          </form>
        </div>

        <form onSubmit={handleAddTeam} className="admin-view__add-team">
          <input
            type="text"
            placeholder="Nome da nova equipe"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <button type="submit">Adicionar equipe</button>
        </form>

        <div className="admin-view__team-grid">
          {state.teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              medal={medalFor(team, ranks.get(team.id) ?? 0)}
              onQuickDelta={(delta, reason, kind) => handleQuickDelta(team.id, delta, reason, kind)}
              onFreeScore={(amount, reason) => handleFreeScore(team.id, amount, reason)}
              onRemove={() => handleRemoveTeam(team.id)}
            />
          ))}
        </div>
      </section>

      <section className="admin-view__accusation">
        <h2>Denúncia (colou / flagrou)</h2>
        <form onSubmit={handleAccusation}>
          <select value={flaggedTeamId} onChange={(e) => setFlaggedTeamId(e.target.value)}>
            <option value="">Equipe flagrada colando</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select value={accuserTeamId} onChange={(e) => setAccuserTeamId(e.target.value)}>
            <option value="">Equipe que denunciou</option>
            {state.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!flaggedTeamId || !accuserTeamId || flaggedTeamId === accuserTeamId}>
            Confirmar denúncia (-20 / +20)
          </button>
        </form>
      </section>

      <section className="admin-view__timer">
        <h2>Cronômetro</h2>
        <TimerControl
          timer={state.timer}
          presets={TIMER_PRESETS}
          clockOffsetMs={clockOffsetMs}
          onSetDuration={(seconds) => socket.emit("timer:setDuration", { seconds })}
          onStart={() => socket.emit("timer:start")}
          onPause={() => socket.emit("timer:pause")}
          onReset={() => socket.emit("timer:reset")}
        />
      </section>

      <section className="admin-view__questions">
        <h2>Perguntas</h2>
        <QuestionBank
          questions={state.questions}
          onAdd={handleAddQuestion}
          onRemove={handleRemoveQuestion}
          onShow={handleShowQuestion}
          onReveal={handleRevealAnswer}
          onHide={handleHideQuestion}
        />
      </section>

      <section className="admin-view__log">
        <LogList history={state.history} onUndoLast={handleUndo} />
      </section>

      <footer className="admin-view__footer">
        {state.gameEnded ? (
          <button type="button" className="admin-view__resume-game" onClick={handleResumeGame}>
            Voltar ao placar
          </button>
        ) : (
          <button
            type="button"
            className="admin-view__end-game"
            onClick={handleEndGame}
            disabled={state.teams.length === 0}
          >
            Finalizar jogo e anunciar vencedor
          </button>
        )}
        <button type="button" className="admin-view__reset-all" onClick={handleResetAll}>
          Reiniciar tudo
        </button>
      </footer>
    </div>
  );
}
