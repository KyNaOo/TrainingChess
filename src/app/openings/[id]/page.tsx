import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionView } from "@/features/session/SessionView";
import { getOpening, getOpenings } from "@/lib/openings";
import { strings } from "@/lib/strings";

// Site statique : seules les ouvertures du contenu existent, tout autre id donne une 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getOpenings().map((opening) => ({ id: opening.id }));
}

export async function generateMetadata({ params }: PageProps<"/openings/[id]">): Promise<Metadata> {
  const opening = getOpening((await params).id);
  return opening === undefined ? {} : { title: `${opening.name} · ${strings.site.name}`, description: opening.summary };
}

export default async function OpeningPage({ params }: PageProps<"/openings/[id]">) {
  const opening = getOpening((await params).id);
  if (opening === undefined) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-foreground/70 underline-offset-4 hover:underline">
          {strings.session.backToOpenings}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{opening.name}</h1>
        <p className="text-foreground/80">
          {strings.session.playing} {strings.sides[opening.side]}
        </p>
      </header>
      <SessionView opening={opening} />
    </main>
  );
}
