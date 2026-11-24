import { parseComment } from "chessops/pgn";
import type { SquareName } from "chessops/types";
import { makeSquare } from "chessops/util";

/** Couleurs d'annotation des études Lichess (`G`, `R`, `Y`, `B`). */
export type Brush = "green" | "red" | "yellow" | "blue";

export interface CommentArrow {
  from: SquareName;
  to: SquareName;
  brush: Brush;
}

export interface CommentHighlight {
  square: SquareName;
  brush: Brush;
}

export interface AnnotatedComment {
  /** Nom de ligne, si le commentaire commence par `#`. */
  lineName: string | null;
  /** Texte affiché, sans annotations ni nom de ligne ; `null` s'il ne reste rien. */
  text: string | null;
  arrows: CommentArrow[];
  highlights: CommentHighlight[];
}

/** Sépare le nom de ligne de l'explication : `# Nom — texte` (tiret cadratin, demi-cadratin ou ` - `). */
const LINE_NAME_SEPARATOR = /\s+[—–-]\s+|\s*[—–]\s*/;

/**
 * Analyse un commentaire PGN au format des études Lichess :
 * - `[%cal Ge2e4,Rd8d1]` → flèches ;
 * - `[%csl Gd5]` → cases surlignées ;
 * - `# Nom — texte` → nom de ligne + texte.
 * Les autres annotations (`[%clk]`, `[%eval]`…) sont retirées du texte.
 */
export function parseAnnotatedComment(raw: string): AnnotatedComment {
  const { text, shapes } = parseComment(raw);
  const arrows: CommentArrow[] = [];
  const highlights: CommentHighlight[] = [];
  for (const shape of shapes) {
    if (shape.from === shape.to) {
      highlights.push({ square: makeSquare(shape.from), brush: shape.color });
    } else {
      arrows.push({ from: makeSquare(shape.from), to: makeSquare(shape.to), brush: shape.color });
    }
  }

  const { lineName, body } = splitLineName(normalizeWhitespace(text));
  return { lineName, text: body === "" ? null : body, arrows, highlights };
}

function splitLineName(text: string): { lineName: string | null; body: string } {
  if (!text.startsWith("#")) return { lineName: null, body: text };
  const withoutHash = text.slice(1).trim();
  const match = LINE_NAME_SEPARATOR.exec(withoutHash);
  if (match === null) return { lineName: withoutHash || null, body: "" };
  const lineName = withoutHash.slice(0, match.index).trim();
  const body = withoutHash.slice(match.index + match[0].length).trim();
  return { lineName: lineName || null, body };
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
