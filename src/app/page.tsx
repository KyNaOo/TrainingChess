import { strings } from "@/lib/strings";

// Page provisoire : le tableau de bord arrive avec l'issue #23.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{strings.site.name}</h1>
      <p className="text-lg text-foreground/80">{strings.site.tagline}</p>
    </main>
  );
}
