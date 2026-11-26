import { shouldAutoplayOpponent } from "@/domain/session/machine";
import type { SessionStoreApi } from "./store";

/** Minuteries injectées : `window` en production, une fausse horloge dans les tests. */
export interface Timers {
  setTimeout: (callback: () => void, delayMs: number) => number;
  clearTimeout: (handle: number) => void;
}

/** Délai avant le coup adverse, le temps de voir le coup précédent. */
export const OPPONENT_MOVE_DELAY_MS = 500;

/**
 * Joue les coups adverses automatiquement : quand `shouldAutoplayOpponent`
 * est vrai, envoie `advance` après `delayMs`. Un changement d'état avant
 * l'échéance (← dans Apprendre, par exemple) annule le coup programmé.
 *
 * Renvoie la fonction de désabonnement, qui annule aussi le coup en attente.
 */
export function startOpponentAutoplay(store: SessionStoreApi, timers: Timers, delayMs = OPPONENT_MOVE_DELAY_MS) {
  let pending: number | null = null;

  const cancel = () => {
    if (pending !== null) timers.clearTimeout(pending);
    pending = null;
  };

  const schedule = () => {
    cancel();
    const { context, state } = store.getState();
    if (!shouldAutoplayOpponent(context, state)) return;
    pending = timers.setTimeout(() => {
      pending = null;
      store.getState().dispatch({ type: "advance" });
    }, delayMs);
  };

  schedule();
  const unsubscribe = store.subscribe((current, previous) => {
    if (current.state !== previous.state) schedule();
  });

  return () => {
    unsubscribe();
    cancel();
  };
}
