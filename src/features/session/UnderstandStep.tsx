import type { Opening, Side } from "@/domain/content/schema";
import { Board } from "@/features/board/Board";
import { strings } from "@/lib/strings";

const SIDES: readonly Side[] = ["white", "black"];

export interface UnderstandStepProps {
  opening: Opening;
  onStart: () => void;
}

/** Étape « Comprendre » : présentation de l'ouverture et position caractéristique. */
export function UnderstandStep({ opening, onStart }: UnderstandStepProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
      <figure className="flex flex-col gap-2 md:order-2">
        <Board
          fen={opening.keyPosition}
          orientation={opening.side}
          ariaLabel={`${strings.understand.keyPosition} : ${opening.name}`}
          viewOnly
        />
        <figcaption className="text-center text-sm text-foreground/70">{strings.understand.keyPosition}</figcaption>
      </figure>

      <div className="flex flex-col gap-6 md:order-1">
        <p className="text-lg leading-relaxed">{opening.summary}</p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{strings.understand.keyIdeas}</h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 leading-relaxed">
            {opening.keyIdeas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{strings.understand.pawnStructures}</h2>
          <p className="leading-relaxed">{opening.pawnStructures}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{strings.understand.typicalPlans}</h2>
          <dl className="flex flex-col gap-3">
            {SIDES.map((side) => (
              <div key={side} className="flex flex-col gap-1">
                <dt className="font-medium">
                  {strings.sides[side]}
                  {side === opening.side && (
                    <span className="text-foreground/70"> {strings.understand.yourSide}</span>
                  )}
                </dt>
                <dd className="leading-relaxed">{opening.typicalPlans[side]}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 md:order-3 md:col-span-2 md:w-auto md:justify-self-start"
      >
        {strings.understand.start}
      </button>
    </div>
  );
}
