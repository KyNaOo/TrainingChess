import type { Config } from "@lichess-org/chessground/config";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { isPromotionMove, legalDests, playUci, positionFromFen } from "@/domain/chess/position";
import type { Arrow, Highlight, Side } from "@/domain/content/schema";

/** Pièces proposées par le sélecteur de promotion, dans l'ordre d'affichage. */
export const PROMOTION_ROLES = ["queen", "rook", "bishop", "knight"] as const;
export type PromotionRole = (typeof PROMOTION_ROLES)[number];

const PROMOTION_LETTERS: Record<PromotionRole, string> = { queen: "q", rook: "r", bishop: "b", knight: "n" };

export const ANIMATION_DURATION_MS = 250;

export interface BoardView {
  fen: string;
  orientation: Side;
  /** Camp que l'utilisateur peut jouer ; `null` = aucun coup possible. */
  playerColor: Side | null;
  viewOnly: boolean;
  arrows: readonly Arrow[];
  highlights: readonly Highlight[];
  /** Dernier coup joué (UCI), surligné sur l'échiquier. */
  lastMove: string | null;
}

/**
 * Traduit l'état affiché en configuration chessground. Fonction pure : appelée
 * au montage puis à chaque changement de props via `api.set`. Les événements
 * sont branchés à part, une seule fois, par le composant.
 */
export function buildBoardConfig(view: BoardView): Config {
  const position = positionFromFen(view.fen);
  if (position === undefined) throw new Error(`FEN invalide pour l'échiquier : ${view.fen}`);

  const canMove = !view.viewOnly && view.playerColor === position.turn && !position.isEnd();

  return {
    fen: view.fen,
    orientation: view.orientation,
    turnColor: position.turn,
    check: position.isCheck() ? position.turn : false,
    lastMove: view.lastMove === null ? undefined : uciToKeys(view.lastMove),
    viewOnly: view.viewOnly,
    coordinates: !view.viewOnly,
    // Sur mobile, glisser une pièce ne doit pas faire défiler la page.
    blockTouchScroll: canMove,
    animation: { enabled: !view.viewOnly, duration: ANIMATION_DURATION_MS },
    movable: {
      free: false,
      color: canMove ? position.turn : undefined,
      dests: canMove ? legalDests(position) : new Map(),
      showDests: true,
    },
    premovable: { enabled: false },
    drawable: {
      enabled: !view.viewOnly,
      autoShapes: toShapes(view.arrows, view.highlights),
    },
  };
}

/** Flèches et cases du contenu → formes chessground (mêmes noms de pinceaux). */
export function toShapes(arrows: readonly Arrow[], highlights: readonly Highlight[]): DrawShape[] {
  return [
    ...highlights.map((highlight) => ({ orig: highlight.square as Key, brush: highlight.brush })),
    ...arrows.map((arrow) => ({ orig: arrow.from as Key, dest: arrow.to as Key, brush: arrow.brush })),
  ];
}

/**
 * Coup UCI standard pour un déplacement fait sur l'échiquier, ou `undefined`
 * s'il est illégal. Ramène le roque « roi prend tour » (e1h1) à e1g1.
 */
export function moveToUci(fen: string, from: Key, to: Key, promotion?: PromotionRole): string | undefined {
  const position = positionFromFen(fen);
  if (position === undefined) return undefined;
  const suffix = promotion === undefined ? "" : PROMOTION_LETTERS[promotion];
  return playUci(position, `${from}${to}${suffix}`)?.move.uci;
}

/** Vrai si ce déplacement est une promotion : il faut demander la pièce avant de jouer. */
export function needsPromotionChoice(fen: string, from: Key, to: Key): boolean {
  const position = positionFromFen(fen);
  if (position === undefined || from === "a0" || to === "a0") return false;
  return isPromotionMove(position, from, to);
}

function uciToKeys(uci: string): Key[] {
  return [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key];
}
