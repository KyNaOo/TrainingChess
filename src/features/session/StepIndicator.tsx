import type { SessionState } from "@/domain/session/machine";
import { strings } from "@/lib/strings";

const STEPS = [
  { phase: "intro", label: strings.steps.understand },
  { phase: "learn", label: strings.steps.learn },
  { phase: "train", label: strings.steps.train },
] as const satisfies ReadonlyArray<{ phase: SessionState["phase"]; label: string }>;

/** Rang de l'étape en cours ; le bilan vient après toutes les étapes. */
function stepIndex(phase: SessionState["phase"]): number {
  const index = STEPS.findIndex((step) => step.phase === phase);
  return index === -1 ? STEPS.length : index;
}

export interface StepIndicatorProps {
  phase: SessionState["phase"];
}

/** Comprendre → Apprendre → S'entraîner, l'étape en cours marquée `aria-current`. */
export function StepIndicator({ phase }: StepIndicatorProps) {
  const current = stepIndex(phase);
  return (
    <nav aria-label={strings.session.stepsLabel}>
      <ol className="flex gap-2 text-sm">
        {STEPS.map((step, index) => {
          const state = index < current ? "done" : index === current ? "current" : "upcoming";
          return (
            <li
              key={step.phase}
              aria-current={state === "current" ? "step" : undefined}
              data-state={state}
              className={
                "flex flex-1 items-center gap-2 border-t-4 pt-2 " +
                (state === "current"
                  ? "border-emerald-600 font-semibold"
                  : state === "done"
                    ? "border-emerald-600/40 text-foreground/70"
                    : "border-foreground/15 text-foreground/70")
              }
            >
              <span aria-hidden="true" className="tabular-nums">
                {index + 1}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
