import type { FormEvent } from "react";
import type { Team } from "../types";
import { LeaderFlame } from "./LeaderFlame";

interface TeamCardProps {
  team: Team;
  isLeader: boolean;
  onQuickDelta: (delta: number, reason: string, kind: "correct" | "incorrect" | "no-answer") => void;
  onFreeScore: (amount: number, reason: string) => void;
  onRemove: () => void;
}

export function TeamCard({ team, isLeader, onQuickDelta, onFreeScore, onRemove }: TeamCardProps) {
  const handleFreeScore = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const amount = Number((form.elements.namedItem("amount") as HTMLInputElement).value);
    const reason = (form.elements.namedItem("reason") as HTMLInputElement).value.trim();
    if (!amount) return;
    onFreeScore(amount, reason || "Pontuação livre");
    form.reset();
  };

  return (
    <div className={`team-card${isLeader ? " team-card--leader" : ""}`} style={{ borderColor: team.color }}>
      <div className="team-card__header">
        <span className="team-card__swatch" style={{ background: team.color }} />
        <h3 className="team-card__name">
          {isLeader && <LeaderFlame className="team-card__flame" />}
          {team.name}
        </h3>
        <button
          type="button"
          className="team-card__remove"
          onClick={onRemove}
          aria-label={`Remover ${team.name}`}
        >
          ×
        </button>
      </div>

      <div className="team-card__score">{team.score}</div>

      <div className="team-card__quick-actions">
        <button
          type="button"
          className="team-card__btn team-card__btn--positive"
          onClick={() => onQuickDelta(10, "Resposta correta", "correct")}
        >
          +10 Acerto
        </button>
        <button
          type="button"
          className="team-card__btn team-card__btn--negative"
          onClick={() => onQuickDelta(-10, "Resposta errada", "incorrect")}
        >
          -10 Erro
        </button>
        <button
          type="button"
          className="team-card__btn team-card__btn--negative"
          onClick={() => onQuickDelta(-20, "Não respondeu / não entregou a tempo", "no-answer")}
        >
          -20 Não entregou
        </button>
      </div>

      <form className="team-card__free-score" onSubmit={handleFreeScore}>
        <input name="amount" type="number" placeholder="Pontos (+/-)" required />
        <input name="reason" type="text" placeholder="Motivo (opcional)" />
        <button type="submit">Aplicar</button>
      </form>
    </div>
  );
}
