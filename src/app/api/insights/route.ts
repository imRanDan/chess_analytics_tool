import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AIInsight } from "@/lib/types";

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 1;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to x-real-ip
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  // No previous request or window expired → allow
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSecs: 0 };
  }

  // Within window — check count
  if (entry.count < MAX_REQUESTS_PER_WINDOW) {
    entry.count++;
    return { allowed: true, retryAfterSecs: 0 };
  }

  // Rate limited
  const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, retryAfterSecs };
}

// ─── Claude Client ──────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a chess coach AI. You will receive a player's recent game statistics and full game list.

Your job: identify the 3 most important patterns that are hurting this player's rating. For each pattern, provide a specific, actionable insight and a real, working link to a free resource on lichess.org or YouTube that directly addresses that weakness.

Rules:
- Base your analysis on the actual data provided (win rates, openings, color performance, game lengths, patterns in results).
- Be color-aware: cross-reference the full game list (each game has c=White or c=Black). Identify weaknesses that are specific to one color, and always specify the color when describing a pattern (e.g. "with Black" or "as White").
- Use the opening stats carefully:
  - Each opening includes overall stats and per-color stats: asWhite and asBlack.
  - When you discuss an opening, specify the color if the weakness is color-specific (for example, "with Black in the Sicilian" instead of just "the Sicilian").
  - Do NOT call an opening a weakness if it clearly has a strong win rate overall; in that case, either skip it or focus on other openings that are underperforming.
- Short game analysis (≤20 moves): look at games with m ≤ 20. If the player LOST several of these short games, consider labeling that insight as "Tactical Blunders" — the player is falling for early tactics or making critical errors in the opening/early middlegame. If the player WON several short games, consider labeling it "Capitalizing on Opponent Mistakes" (a positive pattern to acknowledge but still suggest improving tactical depth). Prefer one of these labels when the data clearly supports it instead of a generic "short game length" observation.
- Be specific — reference their actual numbers and openings (e.g. "You score 35% with Black in the French Defense across 18 games").
- Each resource link MUST be a real, valid URL. Use well-known resources:
  - lichess.org practice tools (e.g. https://lichess.org/practice, https://lichess.org/training/endgame, https://lichess.org/training, https://lichess.org/study)
  - lichess.org opening explorer (https://lichess.org/opening)
  - Known YouTube chess education channels: GothamChess, Daniel Naroditsky (https://www.youtube.com/channel/UCHP9CdeguNUI-_nBv_UXBhw), ChessVibes, Hanging Pawns, chess.com lessons on YouTube, etc.
- Do NOT invent or hallucinate URLs. Only use URLs you are confident exist.

You MUST respond with ONLY a valid JSON array of exactly 3 objects, no markdown, no code fences, no extra text. Each object must have these exact keys:
{
  "pattern": "short title (5-10 words)",
  "explanation": "2-3 sentences analyzing this pattern using the player's actual data",
  "resourceTitle": "Name of the resource",
  "resourceUrl": "https://..."
}`; 

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // Rate limit check
  const ip = getClientIp(request);
  const { allowed, retryAfterSecs } = checkRateLimit(ip);

  if (!allowed) {
    const minutes = Math.ceil(retryAfterSecs / 60);
    return NextResponse.json(
      {
        error: `You've already analyzed your games recently. Come back in ${minutes} minute${minutes === 1 ? "" : "s"} for fresh insights!`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSecs) },
      }
    );
  }

  try {
    const body = await request.json();
    const { stats, games } = body;

    if (!stats || !games) {
      return NextResponse.json(
        { error: "Stats and games data are required" },
        { status: 400 }
      );
    }

    // Build a concise representation of the game list to save tokens
    const condensedGames = games.map(
      (g: { platform: string; result: string; color: string; opening: string; date: string; moves: number }) => ({
        p: g.platform,
        r: g.result,
        c: g.color,
        o: g.opening,
        d: g.date.split("T")[0], // just the date part
        m: g.moves,
      })
    );

    const ratingLine =
      stats.ratingApprox != null
        ? `\nThe player is rated approximately ${stats.ratingApprox}. Calibrate your advice accordingly.\n`
        : "";

    const userMessage = `Here is the player's data:${ratingLine}

## Computed Statistics
${JSON.stringify(stats, null, 2)}

## Full Game List (last ${games.length} games, condensed: p=platform, r=result, c=color, o=opening, d=date, m=moves)
${JSON.stringify(condensedGames)}

Analyze these games and identify the 3 most important patterns hurting this player's rating. Respond with ONLY a JSON array.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let insights: AIInsight[];
    try {
      // Strip any accidental markdown fences
      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      insights = JSON.parse(raw);

      // Validate shape
      if (!Array.isArray(insights) || insights.length === 0) {
        throw new Error("Response is not a non-empty array");
      }

      // Ensure each insight has the required fields
      insights = insights.slice(0, 3).map((item) => ({
        pattern: String(item.pattern || "Unknown pattern"),
        explanation: String(item.explanation || ""),
        resourceTitle: String(item.resourceTitle || "Resource"),
        resourceUrl: String(item.resourceUrl || "https://lichess.org/training"),
      }));
    } catch (parseErr) {
      console.error("Failed to parse Claude response:", textBlock.text, parseErr);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("Insights API error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
