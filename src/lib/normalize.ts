import { NormalizedGame } from "./types";

// ─── Chess.com normalization ────────────────────────────────────────────────

interface ChessComPlayer {
  username: string;
  result: string;
  rating: number;
}

interface ChessComGame {
  white: ChessComPlayer;
  black: ChessComPlayer;
  end_time: number;
  pgn?: string;
  eco?: string; // ECO URL like "https://www.chess.com/openings/Italian-Game..."
}

const CHESSCOM_DRAW_RESULTS = new Set([
  "stalemate",
  "insufficient",
  "agreed",
  "repetition",
  "50move",
  "timevsinsufficient",
]);

function parseChessComResult(playerResult: string): "Win" | "Loss" | "Draw" {
  if (playerResult === "win") return "Win";
  if (CHESSCOM_DRAW_RESULTS.has(playerResult)) return "Draw";
  return "Loss";
}

function parseOpeningFromEcoUrl(ecoUrl: string): string {
  try {
    const url = new URL(ecoUrl);
    // Path looks like: /openings/Italian-Game-Giuoco-Piano-4...Nf6
    const path = url.pathname.split("/openings/")[1] ?? "";
    // Replace hyphens with spaces, strip trailing move indicators like "-3...Bc5"
    const cleaned = path
      .replace(/-(\d)/g, " $1") // keep move numbers readable
      .replace(/-/g, " ");
    return cleaned || "Unknown";
  } catch {
    return "Unknown";
  }
}

function parseOpeningFromPgn(pgn: string): string {
  // Try [Opening "..."] tag first
  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);
  if (openingMatch) return openingMatch[1];

  // Try [ECOUrl "..."]
  const ecoUrlMatch = pgn.match(/\[ECOUrl\s+"([^"]+)"\]/);
  if (ecoUrlMatch) return parseOpeningFromEcoUrl(ecoUrlMatch[1]);

  // Fall back to ECO code
  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
  if (ecoMatch) return ecoMatch[1];

  return "Unknown";
}

function countMovesFromPgn(pgn: string): number {
  // Extract the moves section (everything after the last ] header line)
  const movesSection = pgn.replace(/\[.*?\]\s*/g, "").trim();
  if (!movesSection) return 0;

  // Find all move numbers like "1." "2." "15."
  const moveNumbers = movesSection.match(/(\d+)\./g);
  if (!moveNumbers || moveNumbers.length === 0) return 0;

  // The last move number is the total number of full moves
  const lastMoveNum = Math.max(
    ...moveNumbers.map((m) => parseInt(m.replace(".", ""), 10))
  );
  return lastMoveNum;
}

export function normalizeChessComGame(
  game: ChessComGame,
  username: string
): NormalizedGame {
  const isWhite =
    game.white.username.toLowerCase() === username.toLowerCase();
  const color: "White" | "Black" = isWhite ? "White" : "Black";
  const playerResult = isWhite ? game.white.result : game.black.result;

  // Opening: try the eco field first, then PGN
  let opening = "Unknown";
  if (game.eco) {
    opening = parseOpeningFromEcoUrl(game.eco);
  } else if (game.pgn) {
    opening = parseOpeningFromPgn(game.pgn);
  }

  // Moves: parse from PGN
  const moves = game.pgn ? countMovesFromPgn(game.pgn) : 0;

  // Date: end_time is Unix seconds
  const date = new Date(game.end_time * 1000).toISOString();

  return {
    platform: "chess.com",
    result: parseChessComResult(playerResult),
    color,
    opening,
    date,
    moves,
  };
}

// ─── Lichess normalization ──────────────────────────────────────────────────

interface LichessPlayer {
  user?: { name: string; id: string };
  rating?: number;
  aiLevel?: number;
}

interface LichessGame {
  players: {
    white: LichessPlayer;
    black: LichessPlayer;
  };
  winner?: "white" | "black";
  status: string;
  opening?: { eco: string; name: string; ply: number };
  createdAt: number;
  moves?: string; // space-separated SAN moves
  lastMoveAt?: number;
}

export function normalizeLichessGame(
  game: LichessGame,
  username: string
): NormalizedGame {
  const whiteUser = game.players.white.user?.name ?? game.players.white.user?.id ?? "";
  const blackUser = game.players.black.user?.name ?? game.players.black.user?.id ?? "";
  const isWhite = whiteUser.toLowerCase() === username.toLowerCase();
  const color: "White" | "Black" = isWhite ? "White" : "Black";

  // Result
  let result: "Win" | "Loss" | "Draw";
  if (!game.winner) {
    // Statuses like "draw", "stalemate" with no winner → Draw
    // But "noStart", "aborted" also have no winner — treat as Draw for simplicity
    result = "Draw";
  } else {
    const userColor = isWhite ? "white" : "black";
    result = game.winner === userColor ? "Win" : "Loss";
  }

  // Opening
  const opening = game.opening?.name ?? "Unknown";

  // Moves: lichess `moves` is a space-separated list of SAN half-moves
  let moves = 0;
  if (game.moves) {
    const halfMoves = game.moves.trim().split(/\s+/).length;
    moves = Math.ceil(halfMoves / 2);
  } else if (game.opening?.ply) {
    moves = Math.ceil(game.opening.ply / 2);
  }

  // Date: createdAt is Unix milliseconds
  const date = new Date(game.createdAt).toISOString();

  return {
    platform: "lichess",
    result,
    color,
    opening,
    date,
    moves,
  };
}
