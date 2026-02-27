import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn Chess | Chess Analytics Tool",
  description:
    "Curated free resources to learn chess — from absolute beginner to improving player.",
};

interface Resource {
  title: string;
  description: string;
  url: string;
  tag: string;
  tagColor: string;
}

const RESOURCES: Resource[] = [
  {
    title: "Chess.com — Learn",
    description:
      "Structured lessons from beginner to advanced. Interactive puzzles, videos, and a step-by-step curriculum that adapts to your level.",
    url: "https://www.chess.com/learn",
    tag: "Lessons",
    tagColor: "bg-emerald-900/40 text-emerald-400 border-emerald-700/40",
  },
  {
    title: "Lichess — Learn Chess by Playing",
    description:
      "Completely free, interactive tutorials that teach you how the pieces move, basic tactics, and checkmate patterns — all inside the browser.",
    url: "https://lichess.org/learn",
    tag: "Interactive",
    tagColor: "bg-orange-900/40 text-orange-400 border-orange-700/40",
  },
  {
    title: "Lichess — Practice",
    description:
      "Guided exercises organized by theme: checkmate patterns, basic endgames, intermediate tactics, and more. Play against the engine with hints.",
    url: "https://lichess.org/practice",
    tag: "Practice",
    tagColor: "bg-orange-900/40 text-orange-400 border-orange-700/40",
  },
  {
    title: "GothamChess — YouTube",
    description:
      "Levy Rozman's channel covers everything from beginner guides to grandmaster game breakdowns. One of the most popular chess education channels on YouTube.",
    url: "https://www.youtube.com/@GothamChess",
    tag: "Video",
    tagColor: "bg-red-900/40 text-red-400 border-red-700/40",
  },
  {
    title: "Daniel Naroditsky — YouTube",
    description:
      'Grandmaster Naroditsky\'s "speedrun" series is widely considered one of the best ways to learn how strong players think. Clear explanations at every rating level.',
    url: "https://www.youtube.com/channel/UCHP9CdeguNUI-_nBv_UXBhw",
    tag: "Video",
    tagColor: "bg-red-900/40 text-red-400 border-red-700/40",
  },
  {
    title: "r/chessbeginners",
    description:
      "A welcoming Reddit community for new players. Ask questions, share games, get advice — no question is too basic.",
    url: "https://www.reddit.com/r/chessbeginners/",
    tag: "Community",
    tagColor: "bg-indigo-900/40 text-indigo-400 border-indigo-700/40",
  },
];

function ExternalLinkIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 opacity-50 shrink-0"
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
  );
}

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-100 mb-2">
            Learn Chess
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Whether you&apos;re picking up the pieces for the first time or
            looking to sharpen your skills, these free resources will help you
            improve.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {RESOURCES.map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-gray-800 bg-[#161b22] p-6 flex flex-col hover:border-gray-700 hover:bg-[#1c2333]/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${r.tagColor}`}
                >
                  {r.tag}
                </span>
                <ExternalLinkIcon />
              </div>
              <h2 className="text-base font-semibold text-gray-100 mb-2 group-hover:text-emerald-400 transition-colors">
                {r.title}
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">
                {r.description}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-gray-800 bg-[#161b22] p-8 text-center">
          <p className="text-gray-400 mb-3">
            Already have some games under your belt?
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Analyze Your Games
          </a>
        </div>
      </main>
    </div>
  );
}
