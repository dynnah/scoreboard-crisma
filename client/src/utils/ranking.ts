import type { Team } from "../types";

export const RANK_LABELS = ["1º", "2º", "3º"] as const;
export const RANK_COLOR_CLASS = ["gold", "silver", "bronze"] as const;

// Ranking "1224": equipes empatadas dividem a mesma posição, e a
// próxima posição pula de acordo (ex: dois times em 1º, o seguinte é 3º).
export function rankTeams(sortedTeams: Team[]): Map<string, number> {
  const ranks = new Map<string, number>();
  let rank = 0;
  let prevScore: number | null = null;
  sortedTeams.forEach((team, i) => {
    if (team.score !== prevScore) {
      rank = i + 1;
      prevScore = team.score;
    }
    ranks.set(team.id, rank);
  });
  return ranks;
}

// Medalha só faz sentido pra quem já pontuou (score > 0) e está entre os 3
// primeiros — evita dar ouro/prata/bronze pra todo mundo antes do jogo começar.
export function medalFor(team: Team, rank: number): 1 | 2 | 3 | null {
  if (team.score <= 0 || rank > 3) return null;
  return rank as 1 | 2 | 3;
}
