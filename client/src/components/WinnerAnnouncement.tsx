import type { Team } from "../types";
import { TrophyIcon } from "./TrophyIcon";
import { RANK_COLOR_CLASS, RANK_LABELS, medalFor, rankTeams } from "../utils/ranking";

interface WinnerAnnouncementProps {
  teams: Team[];
}

export function WinnerAnnouncement({ teams }: WinnerAnnouncementProps) {
  const topScore = teams.length > 0 ? Math.max(...teams.map((t) => t.score)) : 0;
  const winners = teams.filter((t) => t.score === topScore);
  const isTie = winners.length > 1;
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const ranks = rankTeams(sortedTeams);
  const rest = sortedTeams.filter((t) => t.score !== topScore);

  return (
    <div className="winner-announcement">
      <TrophyIcon className="winner-announcement__trophy" />
      <div className="winner-announcement__label">{isTie ? "Empate entre" : "Equipe vencedora"}</div>

      <div className="winner-announcement__names">
        {winners.map((team) => (
          <div key={team.id} className="winner-announcement__name">
            {team.name}
          </div>
        ))}
      </div>

      <div className="winner-announcement__score">{topScore} pontos</div>

      {rest.length > 0 && (
        <ol className="winner-announcement__rest">
          {rest.map((team) => {
            const medal = medalFor(team, ranks.get(team.id) ?? 0);
            return (
              <li key={team.id}>
                <span className="winner-announcement__rest-swatch" style={{ background: team.color }} />
                <span>{team.name}</span>
                {medal && (
                  <span
                    className={`winner-announcement__rest-medal winner-announcement__rest-medal--${RANK_COLOR_CLASS[medal - 1]}`}
                  >
                    <TrophyIcon className="winner-announcement__rest-trophy" />
                    {RANK_LABELS[medal - 1]}
                  </span>
                )}
                <span>{team.score}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
