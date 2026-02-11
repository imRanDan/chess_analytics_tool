import { NextRequest, NextResponse } from "next/server";
import { normalizeChessComGame } from "@/lib/normalize";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  const headers = { "User-Agent": "ChessAnalyticsTool/1.0" };
  const baseUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username)}`;

  try {
    // Fetch archives and player stats in parallel (stats for current rating)
    const [archivesRes, statsRes] = await Promise.all([
      fetch(`${baseUrl}/games/archives`, { headers }),
      fetch(`${baseUrl}/stats`, { headers }),
    ]);

    if (!archivesRes.ok) {
      if (archivesRes.status === 404) {
        return NextResponse.json(
          { error: `Chess.com user "${username}" not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Chess.com API error: ${archivesRes.status}` },
        { status: archivesRes.status }
      );
    }

    let rating: number | null = null;
    if (statsRes.ok) {
      const statsData = (await statsRes.json()) as Record<
        string,
        { last?: { rating?: number } }
      >;
      const modes = ["chess_rapid", "chess_blitz", "chess_bullet", "chess_daily"];
      for (const mode of modes) {
        const r = statsData[mode]?.last?.rating;
        if (typeof r === "number") {
          rating = r;
          break;
        }
      }
    }

    const archivesData = await archivesRes.json();
    const archives: string[] = archivesData.archives ?? [];

    if (archives.length === 0) {
      return NextResponse.json({
        games: [],
        source: "chess.com",
        rating,
      });
    }

    // Step 2: Fetch from most recent archives until we have 50 games
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRawGames: any[] = [];
    // Reverse so we start from the most recent month
    const recentArchives = [...archives].reverse();

    for (const archiveUrl of recentArchives) {
      if (allRawGames.length >= 50) break;

      const gamesRes = await fetch(archiveUrl, { headers });

      if (!gamesRes.ok) continue;

      const gamesData = await gamesRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const games: any[] = gamesData.games ?? [];

      // Games within a month are chronological; reverse to get newest first
      allRawGames.push(...games.reverse());
    }

    // Trim to exactly 50 and normalize
    const last50 = allRawGames.slice(0, 50);
    const normalized = last50.map((game) =>
      normalizeChessComGame(game, username)
    );

    return NextResponse.json({
      games: normalized,
      source: "chess.com",
      rating,
    });
  } catch (err) {
    console.error("Chess.com fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch games from Chess.com" },
      { status: 500 }
    );
  }
}
