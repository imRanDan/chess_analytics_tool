import type { NormalizedGame } from "./types";

export interface OpeningStats {
  name: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0–100
}

export interface GameStats {
  totalGames: number;
  overallWinRate: number;
  winRateWhite: number;
  winRateBlack: number;
  wins: number;
  losses: number;
  draws: number;
  whiteGames: number;
  whiteWins: number;
  blackGames: number;
  blackWins: number;
  avgGameLength: number;
  mostPlayedOpenings: OpeningStats[];
  bestOpening: OpeningStats | null;
  worstOpening: OpeningStats | null;
}

function winRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 1000) / 10; // one decimal place
}

function buildOpeningMap(games: NormalizedGame[]): Map<string, OpeningStats> {
  const map = new Map<string, OpeningStats>();

  for (const game of games) {
    const name = game.opening || "Unknown";
    let entry = map.get(name);
    if (!entry) {
      entry = { name, total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
      map.set(name, entry);
    }
    entry.total++;
    if (game.result === "Win") entry.wins++;
    else if (game.result === "Loss") entry.losses++;
    else entry.draws++;
  }

  // Calculate win rates
  for (const entry of map.values()) {
    entry.winRate = winRate(entry.wins, entry.total);
  }

  return map;
}

const MIN_GAMES_FOR_BEST_WORST = 2;

export function computeStats(games: NormalizedGame[]): GameStats {
  const totalGames = games.length;

  // Overall counts
  const wins = games.filter((g) => g.result === "Win").length;
  const losses = games.filter((g) => g.result === "Loss").length;
  const draws = games.filter((g) => g.result === "Draw").length;

  // By color
  const whiteGames = games.filter((g) => g.color === "White");
  const blackGames = games.filter((g) => g.color === "Black");
  const whiteWins = whiteGames.filter((g) => g.result === "Win").length;
  const blackWins = blackGames.filter((g) => g.result === "Win").length;

  // Average game length
  const totalMoves = games.reduce((sum, g) => sum + g.moves, 0);
  const avgGameLength =
    totalGames > 0 ? Math.round((totalMoves / totalGames) * 10) / 10 : 0;

  // Opening stats
  const openingMap = buildOpeningMap(games);
  const allOpenings = Array.from(openingMap.values());

  // Most played: top 5 by total games
  const mostPlayedOpenings = [...allOpenings]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Best/worst: only consider openings with enough games
  const qualifiedOpenings = allOpenings.filter(
    (o) => o.total >= MIN_GAMES_FOR_BEST_WORST
  );

  const bestOpening =
    qualifiedOpenings.length > 0
      ? qualifiedOpenings.reduce((best, o) =>
          o.winRate > best.winRate ||
          (o.winRate === best.winRate && o.total > best.total)
            ? o
            : best
        )
      : allOpenings.length > 0
        ? [...allOpenings].sort((a, b) => b.winRate - a.winRate)[0]
        : null;

  const worstOpening =
    qualifiedOpenings.length > 0
      ? qualifiedOpenings.reduce((worst, o) =>
          o.winRate < worst.winRate ||
          (o.winRate === worst.winRate && o.total > worst.total)
            ? o
            : worst
        )
      : allOpenings.length > 0
        ? [...allOpenings].sort((a, b) => a.winRate - b.winRate)[0]
        : null;

  return {
    totalGames,
    overallWinRate: winRate(wins, totalGames),
    winRateWhite: winRate(whiteWins, whiteGames.length),
    winRateBlack: winRate(blackWins, blackGames.length),
    wins,
    losses,
    draws,
    whiteGames: whiteGames.length,
    whiteWins,
    blackGames: blackGames.length,
    blackWins,
    avgGameLength,
    mostPlayedOpenings,
    bestOpening,
    worstOpening,
  };
}
