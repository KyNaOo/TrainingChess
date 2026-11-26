import { INITIAL_FEN } from "chessops/fen";
import type { Line, Move, Opening } from "../content/schema";
import { dequeue, requeue } from "./queue";

/**
 * Machine à états de la session : `intro → learn → train → summary`.
 *
 * Le réducteur `transition` est pur : il ne lit ni l'horloge ni l'aléatoire.
 * - Les coups adverses ne sont pas joués par la machine : quand c'est à
 *   l'adversaire (`isOpponentTurn`), l'interface envoie `advance` après le
 *   délai de son choix.
 * - L'ordre de la file d'entraînement est fourni par l'événement
 *   `start-training` (voir `initialTrainingOrder` dans `./queue`).
 *
 * Un événement qui n'a pas de sens dans l'état courant est ignoré : le
 * réducteur renvoie alors exactement le même objet d'état.
 */

/** Ce dont la machine a besoin de l'ouverture. */
export type SessionContext = Pick<Opening, "side" | "lines">;

/** Retour affiché après un coup de l'utilisateur dans l'étape « Apprendre ». */
export type LearnFeedback =
  | { kind: "none" }
  /** Bon coup. */
  | { kind: "correct" }
  /** Mauvais coup : on montre le bon (`expected`, en UCI), sans pénalité. */
  | { kind: "hint"; expected: string };

/** Retour affiché après un coup de l'utilisateur dans l'étape « S'entraîner ». */
export type TrainFeedback =
  | { kind: "none" }
  | { kind: "correct" }
  /** 1re erreur sur ce coup : « Pas tout à fait », nouvel essai. */
  | { kind: "retry" }
  /** 2e erreur : le bon coup est montré et doit être joué ; la ligne est ratée. */
  | { kind: "reveal"; expected: string };

/** Une ligne jouée jusqu'au bout pendant l'entraînement. */
export interface TrainAttempt {
  lineIndex: number;
  /** Coups du joueur demandés dans cette ligne. */
  movesRequested: number;
  /** Coups du joueur trouvés sans aucune erreur. */
  movesFoundFirstTry: number;
  /** Vrai si au moins un coup a nécessité deux erreurs. */
  failed: boolean;
}

/** Ligne en cours d'entraînement. */
export interface TrainRun {
  lineIndex: number;
  /** Nombre de coups déjà joués dans la ligne (0 = position initiale). */
  ply: number;
  /** Erreurs sur le coup attendu : 0, 1 ou 2 (2 = bon coup montré). */
  mistakes: 0 | 1 | 2;
  movesRequested: number;
  movesFoundFirstTry: number;
  failed: boolean;
  feedback: TrainFeedback;
}

export type SessionState =
  | { phase: "intro" }
  | {
      phase: "learn";
      lineIndex: number;
      /** Nombre de coups affichés dans la ligne (0 = position initiale). */
      ply: number;
      /** Plus grand `ply` atteint dans cette ligne : → n'avance pas au-delà d'un coup du joueur non trouvé. */
      maxPly: number;
      feedback: LearnFeedback;
    }
  | {
      phase: "train";
      /** Lignes restant à jouer après la ligne en cours, dans l'ordre. */
      queue: number[];
      current: TrainRun;
      /** Lignes terminées, dans l'ordre où elles ont été jouées. */
      attempts: TrainAttempt[];
    }
  | { phase: "summary"; attempts: TrainAttempt[] };

export type SessionEvent =
  /** Quitter « Comprendre » pour « Apprendre ». */
  | { type: "start-learning" }
  /** Coup de l'utilisateur, en UCI (roque au format e1g1). */
  | { type: "play"; uci: string }
  /** Jouer le coup adverse attendu (Apprendre et S'entraîner), ou → dans Apprendre. */
  | { type: "advance" }
  /** ← dans Apprendre. */
  | { type: "back" }
  /** Ligne suivante : dans Apprendre une fois la ligne finie, dans S'entraîner une fois la ligne terminée. */
  | { type: "next-line" }
  /** Commencer l'entraînement ; `order` est une permutation des indices de lignes. */
  | { type: "start-training"; order: readonly number[] }
  /** Depuis l'écran de fin : tout recommencer. */
  | { type: "restart" };

export function initialSessionState(): SessionState {
  return { phase: "intro" };
}

export function transition(context: SessionContext, state: SessionState, event: SessionEvent): SessionState {
  switch (state.phase) {
    case "intro":
      return event.type === "start-learning" ? startLine(0) : state;
    case "learn":
      return learnTransition(context, state, event);
    case "train":
      return trainTransition(context, state, event);
    case "summary":
      return event.type === "restart" ? initialSessionState() : state;
  }
}

type LearnState = Extract<SessionState, { phase: "learn" }>;
type TrainState = Extract<SessionState, { phase: "train" }>;

function startLine(lineIndex: number): LearnState {
  return { phase: "learn", lineIndex, ply: 0, maxPly: 0, feedback: { kind: "none" } };
}

function learnTransition(context: SessionContext, state: LearnState, event: SessionEvent): SessionState {
  const line = lineAt(context, state.lineIndex);
  const next = line.moves[state.ply];

  switch (event.type) {
    case "play": {
      if (next === undefined || next.side !== context.side) return state;
      if (event.uci !== next.uci) return { ...state, feedback: { kind: "hint", expected: next.uci } };
      const ply = state.ply + 1;
      return { ...state, ply, maxPly: Math.max(state.maxPly, ply), feedback: { kind: "correct" } };
    }
    case "advance": {
      if (next === undefined) return state;
      // Un coup du joueur pas encore trouvé doit être joué, pas sauté.
      if (next.side === context.side && state.ply >= state.maxPly) return state;
      const ply = state.ply + 1;
      return { ...state, ply, maxPly: Math.max(state.maxPly, ply), feedback: { kind: "none" } };
    }
    case "back":
      return state.ply === 0 ? state : { ...state, ply: state.ply - 1, feedback: { kind: "none" } };
    case "next-line":
      if (next !== undefined || state.lineIndex + 1 >= context.lines.length) return state;
      return startLine(state.lineIndex + 1);
    case "start-training":
      return startTraining(context, event.order);
    default:
      return state;
  }
}

function startTraining(context: SessionContext, order: readonly number[]): TrainState {
  assertPermutation(order, context.lines.length);
  const first = dequeue(order);
  if (first === undefined) throw new Error("La file d'entraînement est vide.");
  return { phase: "train", queue: first.rest, current: startRun(first.lineIndex), attempts: [] };
}

function startRun(lineIndex: number): TrainRun {
  return {
    lineIndex,
    ply: 0,
    mistakes: 0,
    movesRequested: 0,
    movesFoundFirstTry: 0,
    failed: false,
    feedback: { kind: "none" },
  };
}

function trainTransition(context: SessionContext, state: TrainState, event: SessionEvent): SessionState {
  const { current } = state;
  const line = lineAt(context, current.lineIndex);
  const next = line.moves[current.ply];

  switch (event.type) {
    case "play": {
      if (next === undefined || next.side !== context.side) return state;
      if (event.uci !== next.uci) {
        const mistakes = current.mistakes === 0 ? 1 : 2;
        const feedback: TrainFeedback = mistakes === 1 ? { kind: "retry" } : { kind: "reveal", expected: next.uci };
        return { ...state, current: { ...current, mistakes, failed: current.failed || mistakes === 2, feedback } };
      }
      return completeIfDone(line, {
        ...state,
        current: {
          ...current,
          ply: current.ply + 1,
          mistakes: 0,
          movesRequested: current.movesRequested + 1,
          movesFoundFirstTry: current.movesFoundFirstTry + (current.mistakes === 0 ? 1 : 0),
          feedback: { kind: "correct" },
        },
      });
    }
    case "advance": {
      if (next === undefined || next.side === context.side) return state;
      return completeIfDone(line, { ...state, current: { ...current, ply: current.ply + 1 } });
    }
    case "next-line": {
      if (next !== undefined) return state;
      const head = dequeue(state.queue);
      if (head === undefined) return { phase: "summary", attempts: state.attempts };
      return { ...state, queue: head.rest, current: startRun(head.lineIndex) };
    }
    default:
      return state;
  }
}

/** Quand le dernier coup de la ligne vient d'être joué : on enregistre la tentative et on remet la ligne ratée en fin de file. */
function completeIfDone(line: Line, state: TrainState): TrainState {
  const { current } = state;
  if (current.ply < line.moves.length) return state;
  const attempt: TrainAttempt = {
    lineIndex: current.lineIndex,
    movesRequested: current.movesRequested,
    movesFoundFirstTry: current.movesFoundFirstTry,
    failed: current.failed,
  };
  return {
    ...state,
    queue: current.failed ? requeue(state.queue, current.lineIndex) : state.queue,
    attempts: [...state.attempts, attempt],
  };
}

// --- Sélecteurs ------------------------------------------------------------

/** Ligne affichée, ou `undefined` hors des étapes Apprendre et S'entraîner. */
export function currentLine(context: SessionContext, state: SessionState): Line | undefined {
  const index = currentLineIndex(state);
  return index === undefined ? undefined : context.lines[index];
}

/** Nombre de coups joués dans la ligne affichée (0 = position initiale). */
export function currentPly(state: SessionState): number {
  if (state.phase === "learn") return state.ply;
  if (state.phase === "train") return state.current.ply;
  return 0;
}

/** Dernier coup joué dans la ligne affichée (pour sa FEN, son commentaire, ses flèches). */
export function lastMove(context: SessionContext, state: SessionState): Move | undefined {
  const ply = currentPly(state);
  return ply === 0 ? undefined : currentLine(context, state)?.moves[ply - 1];
}

/** Position affichée : FEN après le dernier coup joué, ou position initiale. */
export function currentFen(context: SessionContext, state: SessionState): string {
  return lastMove(context, state)?.fen ?? INITIAL_FEN;
}

/** Prochain coup de la ligne affichée, ou `undefined` si la ligne est finie. */
export function nextMove(context: SessionContext, state: SessionState): Move | undefined {
  return currentLine(context, state)?.moves[currentPly(state)];
}

/** Vrai quand l'interface doit jouer le coup adverse (événement `advance`) après un court délai. */
export function isOpponentTurn(context: SessionContext, state: SessionState): boolean {
  if (state.phase !== "learn" && state.phase !== "train") return false;
  const move = nextMove(context, state);
  return move !== undefined && move.side !== context.side;
}

/**
 * Vrai quand l'interface doit jouer d'elle-même le coup adverse après un court
 * délai. Dans Apprendre, seulement au bout de ce qui a déjà été vu : après un
 * retour en arrière (←), c'est l'utilisateur qui réavance (→).
 */
export function shouldAutoplayOpponent(context: SessionContext, state: SessionState): boolean {
  if (!isOpponentTurn(context, state)) return false;
  return state.phase !== "learn" || state.ply >= state.maxPly;
}

/** ← dans Apprendre : possible tant qu'on n'est pas sur la position initiale. */
export function canGoBack(state: SessionState): boolean {
  return state.phase === "learn" && state.ply > 0;
}

/** → dans Apprendre : coup adverse, ou coup du joueur déjà trouvé (après un retour en arrière). */
export function canGoForward(context: SessionContext, state: SessionState): boolean {
  if (state.phase !== "learn") return false;
  const move = nextMove(context, state);
  return move !== undefined && (move.side !== context.side || state.ply < state.maxPly);
}

/** Vrai quand l'échiquier attend un coup de l'utilisateur. */
export function isPlayerTurn(context: SessionContext, state: SessionState): boolean {
  if (state.phase !== "learn" && state.phase !== "train") return false;
  const move = nextMove(context, state);
  return move !== undefined && move.side === context.side;
}

/** Vrai quand la ligne affichée a été jouée jusqu'au bout. */
export function isLineComplete(context: SessionContext, state: SessionState): boolean {
  const line = currentLine(context, state);
  return line !== undefined && currentPly(state) >= line.moves.length;
}

/** Vrai sur la dernière ligne de l'étape Apprendre. */
export function isLastLearnLine(context: SessionContext, state: SessionState): boolean {
  return state.phase === "learn" && state.lineIndex === context.lines.length - 1;
}

function currentLineIndex(state: SessionState): number | undefined {
  if (state.phase === "learn") return state.lineIndex;
  if (state.phase === "train") return state.current.lineIndex;
  return undefined;
}

function lineAt(context: SessionContext, index: number): Line {
  const line = context.lines[index];
  if (line === undefined) throw new Error(`Ligne ${index} introuvable.`);
  return line;
}

function assertPermutation(order: readonly number[], length: number): void {
  const sorted = [...order].sort((a, b) => a - b);
  if (sorted.length !== length || sorted.some((value, index) => value !== index)) {
    throw new Error(`Ordre d'entraînement invalide : attendu une permutation de 0 à ${length - 1}.`);
  }
}
