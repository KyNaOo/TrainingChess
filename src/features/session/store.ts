import { createStore, type StoreApi } from "zustand/vanilla";
import {
  initialSessionState,
  type SessionContext,
  type SessionEvent,
  type SessionState,
  transition,
} from "@/domain/session/machine";
import { initialTrainingOrder } from "@/domain/session/queue";

/**
 * Store de session : une simple enveloppe autour du réducteur du domaine.
 * Aucune règle métier ici : chaque action délègue à `transition`.
 *
 * Un store est créé par session (au montage de la page) et vit en mémoire
 * seulement : recharger la page recommence la session.
 */
export interface SessionStore {
  context: SessionContext;
  state: SessionState;
  dispatch: (event: SessionEvent) => void;
  /** Démarre l'entraînement avec la file mélangée par la graine reçue à la création du store. */
  startTraining: () => void;
}

export interface SessionStoreOptions {
  /** Graine du mélange de la file d'entraînement, choisie par la couche UI. */
  seed: number;
}

export type SessionStoreApi = StoreApi<SessionStore>;

export function createSessionStore(context: SessionContext, { seed }: SessionStoreOptions): SessionStoreApi {
  return createStore<SessionStore>()((set, get) => {
    const dispatch = (event: SessionEvent) => {
      const current = get().state;
      const next = transition(context, current, event);
      // Événement ignoré par le réducteur : pas de notification inutile.
      if (next !== current) set({ state: next });
    };
    return {
      context,
      state: initialSessionState(),
      dispatch,
      startTraining: () =>
        dispatch({ type: "start-training", order: initialTrainingOrder(context.lines.length, seed) }),
    };
  });
}
