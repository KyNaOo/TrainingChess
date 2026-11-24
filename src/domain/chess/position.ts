import { castlingSide, Chess } from "chessops/chess";
import { chessgroundDests } from "chessops/compat";
import { makeFen, parseFen } from "chessops/fen";
import { makeSan, parseSan } from "chessops/san";
import type { Color, Move, NormalMove, SquareName } from "chessops/types";
import { kingCastlesTo, makeUci, parseSquare, parseUci, squareRank } from "chessops/util";

export type { Color, SquareName };

/** Coup joué, tel qu'il est stocké dans le contenu généré. */
export interface PlayedMove {
  /** UCI standard : le roque s'écrit e1g1 (et non e1h1, « roi prend tour »). */
  uci: string;
  san: string;
  /** FEN de la position après le coup. */
  fen: string;
  /** Camp qui a joué le coup. */
  side: Color;
}

export interface MoveResult {
  move: PlayedMove;
  /** Nouvelle position ; la position de départ n'est jamais modifiée. */
  position: Chess;
}

export function initialPosition(): Chess {
  return Chess.default();
}

/** Position décrite par `fen`, ou `undefined` si la FEN est invalide ou la position illégale. */
export function positionFromFen(fen: string): Chess | undefined {
  const setup = parseFen(fen);
  if (setup.isErr) return undefined;
  const position = Chess.fromSetup(setup.value);
  return position.isOk ? position.value : undefined;
}

export function toFen(position: Chess): string {
  return makeFen(position.toSetup());
}

/**
 * Joue un coup en notation UCI (`e2e4`, `e7e8q`, `e1g1` ou `e1h1` pour le roque).
 * Renvoie `undefined` si le coup est mal formé ou illégal, y compris une
 * promotion sans pièce précisée (`e7e8`).
 */
export function playUci(position: Chess, uci: string): MoveResult | undefined {
  const move = parseUci(uci);
  if (move === undefined || !position.isLegal(move)) return undefined;
  return play(position, move);
}

/** Joue un coup en notation SAN (`Nf3`, `O-O`, `exd8=Q+`). Renvoie `undefined` si le coup est illégal. */
export function playSan(position: Chess, san: string): MoveResult | undefined {
  const move = parseSan(position, san);
  if (move === undefined) return undefined;
  return play(position, move);
}

/** Destinations légales au format attendu par chessground (option `movable.dests`). */
export function legalDests(position: Chess): Map<SquareName, SquareName[]> {
  return chessgroundDests(position);
}

/**
 * Vrai si déplacer la pièce de `from` vers `to` est une promotion légale :
 * l'interface doit alors demander la pièce de promotion avant de jouer.
 */
export function isPromotionMove(position: Chess, from: SquareName, to: SquareName): boolean {
  const fromSquare = parseSquare(from);
  const toSquare = parseSquare(to);
  const piece = position.board.get(fromSquare);
  if (piece?.role !== "pawn" || piece.color !== position.turn) return false;
  const lastRank = position.turn === "white" ? 7 : 0;
  if (squareRank(toSquare) !== lastRank) return false;
  return position.isLegal({ from: fromSquare, to: toSquare, promotion: "queen" });
}

function play(position: Chess, move: Move): MoveResult {
  const next = position.clone();
  const san = makeSan(position, move);
  next.play(move);
  return {
    move: {
      uci: makeUci(toStandardCastling(position, move)),
      san,
      fen: toFen(next),
      side: position.turn,
    },
    position: next,
  };
}

/** chessops représente le roque par « roi prend tour » (e1h1) ; on le ramène à e1g1. */
function toStandardCastling(position: Chess, move: Move): Move {
  if (!("from" in move)) return move;
  const side = castlingSide(position, move);
  if (side === undefined) return move;
  const standard: NormalMove = { from: move.from, to: kingCastlesTo(position.turn, side) };
  return standard;
}
