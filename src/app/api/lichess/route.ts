import { NextRequest, NextResponse } from "next/server";
import { normalizeLichessGame } from "@/lib/normalize";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const encoded = encodeURIComponent(username);
    // Fetch games and user profile in parallel (profile has current rating)
    const [gamesRes, userRes] = await Promise.all([
      fetch(
        `https://lichess.org/api/games/user/${encoded}?max=50&opening=true&moves=true`,
        { headers: { Accept: "application/x-ndjson" } }
      ),
      fetch(`https://lichess.org/api/user/${encoded}`),
    ]);

    if (!gamesRes.ok) {
      if (gamesRes.status === 404) {
        return NextResponse.json(
          { error: `Lichess user "${username}" not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Lichess API error: ${gamesRes.status}` },
        { status: gamesRes.status }
      );
    }

    let rating: number | null = null;
    if (userRes.ok) {
      const user = (await userRes.json()) as {
        perfs?: Record<
          string,
          { rating?: number; games?: number }
        >;
      };
      const perfs = user.perfs ?? {};
      const modes = ["rapid", "blitz", "bullet", "classical"];
      for (const mode of modes) {
        const p = perfs[mode];
        if (p && typeof p.rating === "number" && (p.games ?? 0) > 0) {
          rating = p.rating;
          break;
        }
      }
      if (rating === null) {
        for (const mode of modes) {
          const r = perfs[mode]?.rating;
          if (typeof r === "number") {
            rating = r;
            break;
          }
        }
      }
    }

    const text = await gamesRes.text();
    const rawGames = text
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));

    const normalized = rawGames.map((game) =>
      normalizeLichessGame(game, username)
    );

    return NextResponse.json({
      games: normalized,
      source: "lichess",
      rating,
    });
  } catch (err) {
    console.error("Lichess fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch games from Lichess" },
      { status: 500 }
    );
  }
}
