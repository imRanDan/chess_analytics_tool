"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedGame, AIInsight } from "@/lib/types";
import { computeStats, type GameStats, type OpeningStats } from "@/lib/stats";

interface FetchResult {
  games: NormalizedGame[];
  source: string;
  rating?: number | null;
}

function ResultBadge({ result }: { result: NormalizedGame["result"] }) {
  const styles = {
    Win: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
    Loss: "bg-red-900/50 text-red-300 border-red-700/50",
    Draw: "bg-gray-700/40 text-gray-400 border-gray-600/50",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${styles[result]}`}
    >
      {result}
    </span>
  );
}

function PlatformBadge({
  platform,
}: {
  platform: NormalizedGame["platform"];
}) {
  const isChessCom = platform === "chess.com";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        isChessCom
          ? "bg-emerald-900/30 text-emerald-400 border-emerald-700/40"
          : "bg-orange-900/30 text-orange-400 border-orange-700/40"
      }`}
    >
      {platform}
    </span>
  );
}

function ColorIndicator({ color }: { color: NormalizedGame["color"] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-3.5 w-3.5 rounded-sm border ${
          color === "White"
            ? "bg-white border-gray-400"
            : "bg-gray-800 border-gray-500"
        }`}
      />
      <span className="text-sm text-gray-300">{color}</span>
    </span>
  );
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Stat Card Components ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = "text-gray-100",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function WinRateBar({
  wins,
  losses,
  draws,
  total,
}: {
  wins: number;
  losses: number;
  draws: number;
  total: number;
}) {
  if (total === 0) return null;
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-800 mt-2">
      {wPct > 0 && (
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${wPct}%` }}
          title={`${wins} wins`}
        />
      )}
      {dPct > 0 && (
        <div
          className="bg-yellow-500 transition-all"
          style={{ width: `${dPct}%` }}
          title={`${draws} draws`}
        />
      )}
      {lPct > 0 && (
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${lPct}%` }}
          title={`${losses} losses`}
        />
      )}
    </div>
  );
}

function OpeningRow({ opening }: { opening: OpeningStats }) {
  return (
    <tr className="border-t border-gray-800/50">
      <td className="py-2 pr-3 text-sm text-gray-300 max-w-[200px] truncate">
        {opening.name}
      </td>
      <td className="py-2 px-3 text-center text-xs text-gray-400 font-mono">
        {opening.total}
      </td>
      <td className="py-2 px-3 text-center text-xs text-emerald-400 font-mono">
        {opening.wins}
      </td>
      <td className="py-2 px-3 text-center text-xs text-red-400 font-mono">
        {opening.losses}
      </td>
      <td className="py-2 px-3 text-center text-xs text-yellow-400 font-mono">
        {opening.draws}
      </td>
      <td className="py-2 pl-3 text-right text-sm font-medium text-gray-200">
        {opening.winRate}%
      </td>
    </tr>
  );
}

function OpeningHighlight({
  label,
  opening,
  accentColor,
}: {
  label: string;
  opening: OpeningStats;
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
        {label}
      </p>
      <p className={`text-base font-semibold ${accentColor} leading-tight mb-1 truncate`}>
        {opening.name}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-100">
          {opening.winRate}%
        </span>
        <span className="text-xs text-gray-500">
          win rate ({opening.wins}W / {opening.losses}L / {opening.draws}D
          &mdash; {opening.total} games)
        </span>
      </div>
    </div>
  );
}

function StatsDashboard({ stats }: { stats: GameStats }) {
  return (
    <div className="mt-8 space-y-6">
      {/* Section heading */}
      <h2 className="text-lg font-medium text-gray-200">
        Performance Summary{" "}
        <span className="text-sm font-normal text-gray-500">
          ({stats.totalGames} games analyzed)
        </span>
      </h2>

      {/* Row 1: Core win-rate cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Overall Win Rate
          </p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-100">
              {stats.overallWinRate}%
            </p>
            {stats.winRateTrend != null && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                  stats.winRateTrend > 0
                    ? "bg-emerald-900/40 text-emerald-400"
                    : stats.winRateTrend < 0
                      ? "bg-red-900/40 text-red-400"
                      : "bg-gray-700/40 text-gray-400"
                }`}
              >
                {stats.winRateTrend > 0 ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                ) : stats.winRateTrend < 0 ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                )}
                {Math.abs(stats.winRateTrend)}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.wins}W / {stats.losses}L / {stats.draws}D
            {stats.winRateTrend != null && (
              <span className="ml-1">
                &middot;{" "}
                {stats.winRateTrend > 0
                  ? "Improving"
                  : stats.winRateTrend < 0
                    ? "Declining"
                    : "Stable"}
              </span>
            )}
          </p>
          <WinRateBar
            wins={stats.wins}
            losses={stats.losses}
            draws={stats.draws}
            total={stats.totalGames}
          />
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Win Rate as White
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-sm border border-gray-400 bg-white" />
            <span className="text-2xl font-bold text-gray-100">
              {stats.winRateWhite}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.whiteWins} wins in {stats.whiteGames} games
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            Win Rate as Black
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-sm border border-gray-500 bg-gray-800" />
            <span className="text-2xl font-bold text-gray-100">
              {stats.winRateBlack}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.blackWins} wins in {stats.blackGames} games
          </p>
        </div>

        <StatCard
          label="Avg Game Length"
          value={`${stats.avgGameLength}`}
          sub="moves per game"
        />
      </div>

      {/* Row 2: Best & Worst opening */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.bestOpening ? (
          <OpeningHighlight
            label="Best Performing Opening"
            opening={stats.bestOpening}
            accentColor="text-emerald-400"
          />
        ) : (
          <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
              Best Performing Opening
            </p>
            <p className="text-sm text-gray-500 italic">
              Play more games to see performance trends
            </p>
          </div>
        )}
        {stats.worstOpening ? (
          <OpeningHighlight
            label="Worst Performing Opening"
            opening={stats.worstOpening}
            accentColor="text-red-400"
          />
        ) : (
          <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
              Worst Performing Opening
            </p>
            <p className="text-sm text-gray-500 italic">
              Play more games to see performance trends
            </p>
          </div>
        )}
      </div>

      {/* Row 3: Most played openings table */}
      {stats.mostPlayedOpenings.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#161b22] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
            Most Played Openings
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Opening</th>
                  <th className="pb-2 px-3 text-center font-medium">Games</th>
                  <th className="pb-2 px-3 text-center font-medium">W</th>
                  <th className="pb-2 px-3 text-center font-medium">L</th>
                  <th className="pb-2 px-3 text-center font-medium">D</th>
                  <th className="pb-2 pl-3 text-right font-medium">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.mostPlayedOpenings.map((op) => (
                  <OpeningRow key={op.name} opening={op} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Insights Components ─────────────────────────────────────────────────

function InsightSkeleton() {
  return (
    <div className="rounded-xl border border-indigo-900/30 bg-[#161b22] p-6 animate-pulse">
      <div className="h-4 w-2/3 bg-gray-700/50 rounded mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-gray-700/30 rounded" />
        <div className="h-3 w-5/6 bg-gray-700/30 rounded" />
        <div className="h-3 w-4/6 bg-gray-700/30 rounded" />
      </div>
      <div className="h-8 w-48 bg-gray-700/30 rounded-lg" />
    </div>
  );
}

function InsightCard({ insight, index }: { insight: AIInsight; index: number }) {
  return (
    <div className="rounded-xl border border-indigo-800/40 bg-gradient-to-br from-[#161b22] to-[#1a1f2e] p-6 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-indigo-900/50 text-indigo-300 text-xs font-bold border border-indigo-700/40">
          {index + 1}
        </span>
        <h3 className="text-base font-semibold text-gray-100 leading-tight">
          {insight.pattern}
        </h3>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed mb-4 flex-1">
        {insight.explanation}
      </p>
      <a
        href={insight.resourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 self-start rounded-lg border border-indigo-700/40 bg-indigo-900/30 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-800/40 hover:text-indigo-200 transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        {insight.resourceTitle}
        <svg
          className="h-3 w-3 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}

function AIInsightsSection({
  insights,
  loading,
  error,
}: {
  insights: AIInsight[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-8 space-y-4">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h2 className="text-lg font-medium text-gray-200">
          AI Coach Insights
        </h2>
        {loading && (
          <span className="text-xs text-indigo-400 animate-pulse">
            Analyzing your games...
          </span>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-indigo-800/30 bg-indigo-900/10 p-4 text-indigo-300 text-sm">
          <span className="font-medium">Insights unavailable:</span> {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightSkeleton />
          <InsightSkeleton />
          <InsightSkeleton />
        </div>
      )}

      {/* Insight cards */}
      {!loading && insights && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const [chessComUsername, setChessComUsername] = useState("");
  const [lichessUsername, setLichessUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedGames, setCombinedGames] = useState<NormalizedGame[] | null>(
    null
  );
  const [fetchCounts, setFetchCounts] = useState<{
    chessComCount: number;
    lichessCount: number;
  } | null>(null);
  const [ratings, setRatings] = useState<{
    chessCom: number | null;
    lichess: number | null;
  }>({ chessCom: null, lichess: null });

  const [aiInsights, setAiInsights] = useState<AIInsight[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const gameStats = useMemo<GameStats | null>(() => {
    if (!combinedGames || combinedGames.length === 0) return null;
    return computeStats(combinedGames);
  }, [combinedGames]);

  // Fetch AI insights when stats are computed
  const insightsRequested = useRef(false);

  const fetchInsights = useCallback(
    async (stats: GameStats, games: NormalizedGame[]) => {
      setInsightsLoading(true);
      setInsightsError(null);
      setAiInsights(null);

      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stats, games }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to get insights");
        setAiInsights(data.insights);
      } catch (err) {
        setInsightsError(
          err instanceof Error ? err.message : "Failed to generate insights"
        );
      } finally {
        setInsightsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!gameStats || !combinedGames || insightsRequested.current) return;
    insightsRequested.current = true;
    const chess = ratings.chessCom;
    const lichess = ratings.lichess;
    const ratingApprox =
      chess != null && lichess != null
        ? Math.round((chess + lichess) / 2)
        : chess ?? lichess ?? null;
    const statsWithRating: GameStats = {
      ...gameStats,
      ratingApprox: ratingApprox ?? undefined,
      ratingBySource:
        chess != null || lichess != null
          ? { chessCom: chess ?? undefined, lichess: lichess ?? undefined }
          : undefined,
    };
    fetchInsights(statsWithRating, combinedGames);
  }, [gameStats, combinedGames, ratings, fetchInsights]);

  const handleFetch = async () => {
    if (!chessComUsername.trim() && !lichessUsername.trim()) {
      setError("Please enter at least one username.");
      return;
    }

    setLoading(true);
    setError(null);
    setCombinedGames(null);
    setFetchCounts(null);
    setRatings({ chessCom: null, lichess: null });
    setAiInsights(null);
    setInsightsError(null);
    insightsRequested.current = false;

    try {
      const promises: Promise<FetchResult | null>[] = [];

      // Fetch Chess.com games
      if (chessComUsername.trim()) {
        promises.push(
          fetch(
            `/api/chess-com?username=${encodeURIComponent(chessComUsername.trim())}`
          ).then(async (res) => {
            const data = await res.json();
            if (!res.ok)
              throw new Error(data.error || "Chess.com fetch failed");
            return data as FetchResult;
          })
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      // Fetch Lichess games
      if (lichessUsername.trim()) {
        promises.push(
          fetch(
            `/api/lichess?username=${encodeURIComponent(lichessUsername.trim())}`
          ).then(async (res) => {
            const data = await res.json();
            if (!res.ok)
              throw new Error(data.error || "Lichess fetch failed");
            return data as FetchResult;
          })
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      const [chessComResult, lichessResult] = await Promise.all(promises);

      const chessComGames = chessComResult?.games ?? [];
      const lichessGames = lichessResult?.games ?? [];

      // Combine and sort by date (most recent first)
      const combined = [...chessComGames, ...lichessGames].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setCombinedGames(combined);
      setFetchCounts({
        chessComCount: chessComGames.length,
        lichessCount: lichessGames.length,
      });
      setRatings({
        chessCom: chessComResult?.rating ?? null,
        lichess: lichessResult?.rating ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#161b22]">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center gap-3">
          <svg
            className="w-8 h-8 text-emerald-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          <h1 className="text-xl font-semibold tracking-tight">
            Chess Analytics Tool
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Input Card */}
        <div className="rounded-xl border border-gray-800 bg-[#161b22] p-8 shadow-lg">
          <h2 className="text-lg font-medium text-gray-200 mb-6">
            Enter your usernames to fetch recent games
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chess.com Input */}
            <div>
              <label
                htmlFor="chesscom"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Chess.com Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-emerald-400 text-sm font-medium">
                    chess.com
                  </span>
                </div>
                <input
                  id="chesscom"
                  type="text"
                  value={chessComUsername}
                  onChange={(e) => setChessComUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  placeholder="hikaru"
                  className="w-full rounded-lg border border-gray-700 bg-[#0d1117] py-2.5 pl-[5.5rem] pr-4 text-gray-100 placeholder-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Lichess Input */}
            <div>
              <label
                htmlFor="lichess"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Lichess Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-orange-400 text-sm font-medium">
                    lichess
                  </span>
                </div>
                <input
                  id="lichess"
                  type="text"
                  value={lichessUsername}
                  onChange={(e) => setLichessUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  placeholder="DrNykterstein"
                  className="w-full rounded-lg border border-gray-700 bg-[#0d1117] py-2.5 pl-[4.5rem] pr-4 text-gray-100 placeholder-gray-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={handleFetch}
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#161b22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Fetching...
                </span>
              ) : (
                "Fetch Games"
              )}
            </button>

            {fetchCounts && (
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <span>
                  Chess.com:{" "}
                  <span className="text-emerald-400 font-medium">
                    {fetchCounts.chessComCount}
                  </span>{" "}
                  games
                </span>
                <span>
                  Lichess:{" "}
                  <span className="text-orange-400 font-medium">
                    {fetchCounts.lichessCount}
                  </span>{" "}
                  games
                </span>
                <span>
                  Total:{" "}
                  <span className="text-gray-200 font-medium">
                    {fetchCounts.chessComCount + fetchCounts.lichessCount}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-red-400 text-sm">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* Stats Dashboard */}
        {gameStats && <StatsDashboard stats={gameStats} />}

        {/* AI Insights */}
        {(insightsLoading || aiInsights || insightsError) && (
          <AIInsightsSection
            insights={aiInsights}
            loading={insightsLoading}
            error={insightsError}
          />
        )}

        {/* Results Table */}
        {combinedGames && combinedGames.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-200 mb-4">
              Game History{" "}
              <span className="text-sm font-normal text-gray-500">
                ({combinedGames.length} games, sorted by date)
              </span>
            </h2>
            <div className="rounded-xl border border-gray-800 bg-[#161b22] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#1c2333]">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Platform
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Result
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Color
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Opening
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Moves
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {combinedGames.map((game, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-[#1c2333]/60 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <PlatformBadge platform={game.platform} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-200 text-sm">
                            {formatDate(game.date)}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatTime(game.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ResultBadge result={game.result} />
                        </td>
                        <td className="px-4 py-3">
                          <ColorIndicator color={game.color} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-300 text-sm max-w-[250px] truncate block">
                            {game.opening}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-300 font-mono text-sm">
                            {game.moves}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {combinedGames && combinedGames.length === 0 && (
          <div className="mt-8 text-center py-12 text-gray-500">
            No games found for the given username(s).
          </div>
        )}
      </main>
    </div>
  );
}
