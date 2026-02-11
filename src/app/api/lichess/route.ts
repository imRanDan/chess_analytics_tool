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
    // Lichess API: fetch last 50 games as NDJSON with opening info and moves
    const res = await fetch(
      `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=50&opening=true&moves=true`,
      {
        headers: {
          Accept: "application/x-ndjson",
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: `Lichess user "${username}" not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Lichess API error: ${res.status}` },
        { status: res.status }
      );
    }

    const text = await res.text();
    // NDJSON: each line is a JSON object
    const rawGames = text
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));

    const normalized = rawGames.map((game) =>
      normalizeLichessGame(game, username)
    );

    return NextResponse.json({ games: normalized, source: "lichess" });
  } catch (err) {
    console.error("Lichess fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch games from Lichess" },
      { status: 500 }
    );
  }
}
