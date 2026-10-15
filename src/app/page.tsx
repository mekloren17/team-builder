import { initialOverall } from "@/lib/engine/engine";

// Placeholder home page: proves the engine is wired into the app.
const sampleOverall = initialOverall({
  age: 28,
  level: "semipro",
  years: "10+",
  freq: "1w",
  attrs: [3, 4, 4, 3, 3, 4],
  positions: ["MID"],
  gkRotation: false,
});

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Team Builder</h1>
      <p className="max-w-sm text-lg text-zinc-600 dark:text-zinc-400">
        Balanced teams for 5-a-side and 7-a-side. Coming soon.
      </p>
      <p className="text-sm text-zinc-500">Engine check: sample overall {sampleOverall}</p>
    </main>
  );
}
