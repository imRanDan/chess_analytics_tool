"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  FILES,
  RANKS,
  PIECE_SYMBOLS,
  PIECE_NAMES,
  STARTING_POSITION,
  buildPieceBank,
  type ChessPiece,
} from "@/lib/chess-setup";

// ─── Draggable piece ─────────────────────────────────────────────────────────

function DraggablePiece({
  id,
  piece,
  size,
}: {
  id: string;
  piece: ChessPiece;
  size: "sm" | "lg";
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: piece,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none !text-white outline-none focus:outline-none ${
        isDragging ? "opacity-30" : "opacity-100"
      } ${size === "lg" ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl"}`}
      style={{ lineHeight: 1 }}
    >
      {PIECE_SYMBOLS[piece.color][piece.type]}
    </div>
  );
}

// ─── Droppable board square ──────────────────────────────────────────────────

function BoardSquare({
  square,
  isLight,
  piece,
  pieceId,
  result,
}: {
  square: string;
  isLight: boolean;
  piece: (ChessPiece & { id: string }) | null;
  pieceId: string | null;
  result: "correct" | "wrong" | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `square-${square}` });

  let bg = isLight ? "bg-[#b7c0d8]" : "bg-[#6b7db3]";
  if (result === "correct") bg = isLight ? "bg-emerald-300" : "bg-emerald-500";
  else if (result === "wrong") bg = isLight ? "bg-red-300" : "bg-red-500";

  return (
    <div
      ref={setNodeRef}
      className={`relative aspect-square flex items-center justify-center outline-none ${bg} ${
        isOver ? "ring-2 ring-inset ring-yellow-400" : ""
      } transition-colors`}
    >
      {piece && pieceId && (
        <DraggablePiece id={pieceId} piece={piece} size="lg" />
      )}
    </div>
  );
}

// ─── Piece in the bank (draggable from side tray) ────────────────────────────

function BankPiece({ id, piece }: { id: string; piece: ChessPiece }) {
  const isWhite = piece.color === "w";
  return (
    <div
      className={`flex flex-col items-center justify-center w-12 h-14 md:w-14 md:h-16 rounded-lg border transition-colors ${
        isWhite
          ? "bg-gray-200/10 border-gray-500 hover:border-gray-400"
          : "bg-gray-900/60 border-gray-700 hover:border-gray-500"
      }`}
    >
      <DraggablePiece id={id} piece={piece} size="sm" />
      <span
        className={`text-[9px] font-bold mt-0.5 ${
          isWhite ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {PIECE_NAMES[piece.type]}
      </span>
    </div>
  );
}

// ─── Main game component ─────────────────────────────────────────────────────

export default function PiecePlacementGame() {
  const [bankPieces, setBankPieces] = useState<
    (ChessPiece & { id: string })[]
  >([]);
  const [boardState, setBoardState] = useState<
    Record<string, (ChessPiece & { id: string }) | null>
  >({});
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    piece: ChessPiece;
  } | null>(null);
  const [results, setResults] = useState<Record<string, "correct" | "wrong">>(
    {}
  );
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(
    null
  );

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 4 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 100, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const initGame = useCallback(() => {
    const pieces = buildPieceBank();
    setBankPieces(pieces);
    setBoardState({});
    setResults({});
    setChecked(false);
    setScore(null);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const piecesOnBoard = useMemo(
    () =>
      new Set(
        Object.values(boardState)
          .filter(Boolean)
          .map((p) => p!.id)
      ),
    [boardState]
  );

  const remainingBank = useMemo(
    () => bankPieces.filter((p) => !piecesOnBoard.has(p.id)),
    [bankPieces, piecesOnBoard]
  );

  const remainingWhite = useMemo(
    () => remainingBank.filter((p) => p.color === "w"),
    [remainingBank]
  );
  const remainingBlack = useMemo(
    () => remainingBank.filter((p) => p.color === "b"),
    [remainingBank]
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const piece = active.data.current as ChessPiece;
    setActiveDrag({ id: String(active.id), piece });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = String(active.id);
    const piece = active.data.current as ChessPiece & { id: string };
    const targetId = String(over.id);

    if (targetId.startsWith("square-")) {
      const square = targetId.replace("square-", "");

      // Remove piece from its previous square if it was on the board
      setBoardState((prev) => {
        const next = { ...prev };
        for (const [sq, p] of Object.entries(next)) {
          if (p?.id === draggedId) {
            next[sq] = null;
          }
        }
        // If there's already a piece on the target square, send it back to bank
        next[square] = { ...piece, id: draggedId };
        return next;
      });

      if (checked) {
        setChecked(false);
        setResults({});
        setScore(null);
      }
    } else if (targetId === "bank-drop") {
      // Dropping back to bank — remove from board
      setBoardState((prev) => {
        const next = { ...prev };
        for (const [sq, p] of Object.entries(next)) {
          if (p?.id === draggedId) {
            next[sq] = null;
          }
        }
        return next;
      });
    }
  }

  function checkAnswer() {
    const newResults: Record<string, "correct" | "wrong"> = {};
    let correct = 0;
    const total = Object.keys(STARTING_POSITION).length;

    for (const [square, expected] of Object.entries(STARTING_POSITION)) {
      const placed = boardState[square];
      if (
        placed &&
        placed.type === expected.type &&
        placed.color === expected.color
      ) {
        newResults[square] = "correct";
        correct++;
      } else {
        newResults[square] = "wrong";
      }
    }

    // Mark squares that have a piece but shouldn't
    for (const [square, piece] of Object.entries(boardState)) {
      if (piece && !STARTING_POSITION[square]) {
        newResults[square] = "wrong";
      }
    }

    setResults(newResults);
    setChecked(true);
    setScore({ correct, total });
  }

  function showAnswer() {
    const answer: Record<string, (ChessPiece & { id: string }) | null> = {};
    let idx = 0;
    for (const [square, piece] of Object.entries(STARTING_POSITION)) {
      answer[square] = { ...piece, id: `answer-${idx++}` };
    }
    setBoardState(answer);
    setBankPieces([]);
    setResults({});
    setChecked(false);
    setScore(null);
  }

  const placedCount = Object.values(boardState).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100">
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <a
              href="/learn"
              className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              &larr; Back to Learn
            </a>
          </div>
          <h1 className="text-2xl font-semibold text-gray-100 mb-1">
            Where Do the Pieces Go?
          </h1>
          <p className="text-gray-400 text-sm">
            Drag all 32 pieces to their correct starting positions on the board.
          </p>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Board */}
            <div className="flex-shrink-0">
              <div className="inline-block">
                <div className="flex">
                  {/* Left rank labels */}
                  <div className="flex flex-col w-6">
                    {RANKS.map((r) => (
                      <div
                        key={r}
                        className="h-[clamp(40px,8vw,72px)] flex items-center justify-center text-xs text-gray-500 font-mono"
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                  {/* Board grid */}
                  <div
                    className="grid grid-cols-8 border border-gray-600 rounded-md overflow-hidden"
                    style={{
                      width: "clamp(320px, 64vw, 576px)",
                      height: "clamp(320px, 64vw, 576px)",
                    }}
                  >
                    {RANKS.map((rank) =>
                      FILES.map((file) => {
                        const square = `${file}${rank}`;
                        const isLight =
                          (FILES.indexOf(file) + rank) % 2 === 0;
                        const piece = boardState[square] ?? null;
                        return (
                          <BoardSquare
                            key={square}
                            square={square}
                            isLight={isLight}
                            piece={piece}
                            pieceId={piece?.id ?? null}
                            result={results[square] ?? null}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
                {/* Bottom file labels */}
                <div className="flex ml-6">
                  {FILES.map((f) => (
                    <div
                      key={f}
                      className="w-[clamp(40px,8vw,72px)] text-center text-xs text-gray-500 font-mono pt-1"
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div className="flex-1 min-w-0">
              {/* Piece bank */}
              <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Piece Bank
                  </p>
                  <span className="text-xs text-gray-500">
                    {remainingBank.length} remaining
                  </span>
                </div>
                <PieceBankDropZone>
                  {remainingBank.length > 0 ? (
                    <div className="space-y-3">
                      {remainingWhite.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block h-3 w-3 rounded-sm border border-gray-400 bg-white" />
                            <span className="text-xs font-medium text-gray-400">
                              White ({remainingWhite.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {remainingWhite.map((p) => (
                              <BankPiece key={p.id} id={p.id} piece={p} />
                            ))}
                          </div>
                        </div>
                      )}
                      {remainingBlack.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block h-3 w-3 rounded-sm border border-gray-600 bg-gray-800" />
                            <span className="text-xs font-medium text-gray-400">
                              Black ({remainingBlack.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {remainingBlack.map((p) => (
                              <BankPiece key={p.id} id={p.id} piece={p} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 text-center py-4">
                      {checked
                        ? "All pieces checked!"
                        : "All pieces placed — ready to check!"}
                    </p>
                  )}
                </PieceBankDropZone>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={checkAnswer}
                  disabled={placedCount === 0}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Check Answer
                </button>
                <button
                  onClick={showAnswer}
                  className="rounded-lg border border-gray-700 bg-[#161b22] px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-[#1c2333] transition-colors"
                >
                  Show Answer
                </button>
                <button
                  onClick={initGame}
                  className="rounded-lg border border-gray-700 bg-[#161b22] px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-[#1c2333] transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Score display */}
              {score && (
                <div
                  className={`rounded-xl border p-5 ${
                    score.correct === score.total
                      ? "border-emerald-700/50 bg-emerald-900/20"
                      : "border-gray-800 bg-[#161b22]"
                  }`}
                >
                  {score.correct === score.total ? (
                    <div>
                      <p className="text-lg font-bold text-emerald-400 mb-1">
                        Perfect Score!
                      </p>
                      <p className="text-sm text-gray-400">
                        All {score.total} pieces placed correctly. You know your
                        starting position!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-bold text-gray-100 mb-1">
                        {score.correct} / {score.total} correct
                      </p>
                      <p className="text-sm text-gray-400">
                        Green squares are correct, red squares need fixing. Keep
                        going!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Hint card */}
              {!checked && (
                <div className="mt-4 rounded-xl border border-gray-800 bg-[#161b22] p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                    Hints
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1.5">
                    <li>
                      <span className="text-gray-300">White</span> pieces go on
                      ranks 1 &amp; 2,{" "}
                      <span className="text-gray-300">Black</span> on ranks 7 &amp;
                      8
                    </li>
                    <li>
                      The <span className="text-gray-300">Queen</span> goes on
                      her own color (white queen on light square)
                    </li>
                    <li>
                      <span className="text-gray-300">Knights</span> go next to
                      the Rooks, <span className="text-gray-300">Bishops</span>{" "}
                      next to Knights
                    </li>
                    <li>
                      Drag pieces back to the bank if you change your mind
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Drag overlay for smooth dragging */}
          <DragOverlay dropAnimation={null}>
            {activeDrag ? (
              <div className="min-w-[3rem] min-h-[3rem] flex items-center justify-center text-5xl md:text-6xl select-none pointer-events-none drop-shadow-lg outline-none !text-white">
                {PIECE_SYMBOLS[activeDrag.piece.color][activeDrag.piece.type]}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}

// ─── Bank drop zone (for returning pieces) ───────────────────────────────────

function PieceBankDropZone({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: "bank-drop" });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-lg transition-colors ${
        isOver ? "bg-gray-800/60 ring-1 ring-gray-600" : ""
      }`}
    >
      {children}
    </div>
  );
}
