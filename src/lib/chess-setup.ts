export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type PieceColor = "w" | "b";

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
  b: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
};

export const PIECE_NAMES: Record<PieceType, string> = {
  K: "King",
  Q: "Queen",
  R: "Rook",
  B: "Bishop",
  N: "Knight",
  P: "Pawn",
};

export const STARTING_POSITION: Record<string, ChessPiece> = {
  a1: { type: "R", color: "w" },
  b1: { type: "N", color: "w" },
  c1: { type: "B", color: "w" },
  d1: { type: "Q", color: "w" },
  e1: { type: "K", color: "w" },
  f1: { type: "B", color: "w" },
  g1: { type: "N", color: "w" },
  h1: { type: "R", color: "w" },
  a2: { type: "P", color: "w" },
  b2: { type: "P", color: "w" },
  c2: { type: "P", color: "w" },
  d2: { type: "P", color: "w" },
  e2: { type: "P", color: "w" },
  f2: { type: "P", color: "w" },
  g2: { type: "P", color: "w" },
  h2: { type: "P", color: "w" },
  a7: { type: "P", color: "b" },
  b7: { type: "P", color: "b" },
  c7: { type: "P", color: "b" },
  d7: { type: "P", color: "b" },
  e7: { type: "P", color: "b" },
  f7: { type: "P", color: "b" },
  g7: { type: "P", color: "b" },
  h7: { type: "P", color: "b" },
  a8: { type: "R", color: "b" },
  b8: { type: "N", color: "b" },
  c8: { type: "B", color: "b" },
  d8: { type: "Q", color: "b" },
  e8: { type: "K", color: "b" },
  f8: { type: "B", color: "b" },
  g8: { type: "N", color: "b" },
  h8: { type: "R", color: "b" },
};

export function buildPieceBank(): (ChessPiece & { id: string })[] {
  const pieces: (ChessPiece & { id: string })[] = [];
  let idx = 0;
  for (const [, piece] of Object.entries(STARTING_POSITION)) {
    pieces.push({ ...piece, id: `bank-${idx++}` });
  }
  // Shuffle for the challenge
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}
