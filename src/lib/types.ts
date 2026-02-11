export interface NormalizedGame {
  platform: "chess.com" | "lichess";
  result: "Win" | "Loss" | "Draw";
  color: "White" | "Black";
  opening: string;
  date: string; // ISO date string
  moves: number;
}

export interface AIInsight {
  pattern: string;       // short title of the weakness pattern
  explanation: string;   // 2-3 sentence analysis referencing the player's data
  resourceTitle: string; // name of the recommended resource
  resourceUrl: string;   // URL to lichess.org or YouTube
}
