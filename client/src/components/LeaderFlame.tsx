// Assinatura visual: chama dourada que ecoa os raios da logo, acesa
// apenas sobre a equipe líder do placar. Duas camadas (chama + núcleo)
// pra ficar reconhecível como fogo mesmo em tamanho pequeno.
export function LeaderFlame({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      className={`leader-flame ${className}`.trim()}
    >
      <path
        fill="currentColor"
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      />
      <path
        className="leader-flame__core"
        fill="var(--bg-app, #fff7f7)"
        d="M12 21a3.5 3.5 0 0 0 3.5-3.5c0-1.4-.9-2.3-1.9-3.3-.5.9-1.1 1.4-1.6 1.9-.6.6-1.5 1.2-1.5 2.4A3.5 3.5 0 0 0 12 21z"
      />
    </svg>
  );
}
