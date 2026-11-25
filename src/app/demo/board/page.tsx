import type { Metadata } from "next";
import { BoardDemo } from "@/features/board/BoardDemo";
import { strings } from "@/lib/strings";

// Page temporaire pour tester l'échiquier à la main (issue #8) ; à retirer une fois la session en place.
export const metadata: Metadata = {
  title: `${strings.boardDemo.title} · ${strings.site.name}`,
  robots: { index: false },
};

export default function BoardDemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{strings.boardDemo.title}</h1>
        <p className="text-foreground/80">{strings.boardDemo.description}</p>
      </header>
      <BoardDemo />
    </main>
  );
}
