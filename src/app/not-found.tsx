import type { Metadata } from "next";
import Link from "next/link";
import { strings } from "@/lib/strings";

export const metadata: Metadata = {
  title: `${strings.notFound.title} · ${strings.site.name}`,
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{strings.notFound.title}</h1>
      <p className="text-lg text-foreground/80">{strings.notFound.description}</p>
      <Link href="/" className="self-start underline underline-offset-4">
        {strings.notFound.backToOpenings}
      </Link>
    </main>
  );
}
