"use client";

import { useEffect, useState } from "react";
import { useStore } from "zustand";
import type { Opening } from "@/domain/content/schema";
import { currentFen, isPlayerTurn, lastMove, type SessionState } from "@/domain/session/machine";
import { Board } from "@/features/board/Board";
import { strings } from "@/lib/strings";
import { startOpponentAutoplay, type Timers } from "./autoplay";
import { createSessionStore } from "./store";

const browserTimers: Timers = {
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clearTimeout: (handle) => window.clearTimeout(handle),
};

/** Graine du mélange de la file : l'aléatoire vit ici, dans la couche UI, jamais dans `domain/`. */
function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

const STEP_LABELS: Record<SessionState["phase"], string> = {
  intro: strings.steps.understand,
  learn: strings.steps.learn,
  train: strings.steps.train,
  summary: strings.steps.summary,
};

export interface SessionViewProps {
  opening: Opening;
}

/**
 * Session d'une ouverture. L'état vit dans un store créé au montage, en
 * mémoire seulement : recharger la page recommence la session.
 *
 * Les étapes Comprendre / Apprendre / S'entraîner / Bilan viennent se
 * brancher ici (issues #13 à #16).
 */
export function SessionView({ opening }: SessionViewProps) {
  const [store] = useState(() => createSessionStore(opening, { seed: randomSeed() }));
  const state = useStore(store, (s) => s.state);
  const dispatch = useStore(store, (s) => s.dispatch);

  useEffect(() => startOpponentAutoplay(store, browserTimers), [store]);

  const playerTurn = isPlayerTurn(opening, state);

  return (
    <section className="flex flex-col gap-4" data-phase={state.phase}>
      <p className="text-sm text-foreground/70">
        <span className="sr-only">{strings.session.currentStep}</span> {STEP_LABELS[state.phase]}
      </p>
      <div className="w-full max-w-[min(100%,32rem)] self-center">
        <Board
          fen={currentFen(opening, state)}
          orientation={opening.side}
          ariaLabel={strings.board.ariaLabel}
          playerColor={playerTurn ? opening.side : undefined}
          onMove={(uci) => dispatch({ type: "play", uci })}
          lastMove={lastMove(opening, state)?.uci ?? null}
        />
      </div>
    </section>
  );
}
