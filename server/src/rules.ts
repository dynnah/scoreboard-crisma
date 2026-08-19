// Constantes de pontuação e cronômetro da Gincana da Crisma.
// Alterar valores aqui muda as regras do jogo em todo o sistema.

export const STARTING_SCORE = 100;

export const POINTS = {
  CORRECT: 10,
  INCORRECT: -10,
  NO_ANSWER: -20,
  ACCUSATION_TRANSFER: 20,
} as const;

export const TIMER_PRESETS_SEC = [30, 60, 90, 120] as const;
export const DEFAULT_TIMER_SEC = 90;

// Paleta de cores das equipes: variada, distinta da identidade vinho/dourado
// da pastoral (sem tons de vermelho), para nunca se confundir com o app.
export const TEAM_COLOR_PALETTE = [
  { name: "Azul", hex: "#3B82F6" },
  { name: "Verde", hex: "#22A55B" },
  { name: "Roxo", hex: "#8B5CF6" },
  { name: "Laranja", hex: "#F2711C" },
  { name: "Magenta", hex: "#D6409F" },
  { name: "Teal", hex: "#0D9488" },
  { name: "Índigo", hex: "#6366F1" },
  { name: "Oliva", hex: "#818A1A" },
] as const;
