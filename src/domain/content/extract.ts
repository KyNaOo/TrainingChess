import type { Chess } from "chessops/chess";
import { type ChildNode, type Node, parsePgn, type PgnNodeData } from "chessops/pgn";
import { parseAnnotatedComment } from "../chess/comment";
import { initialPosition, playSan, positionFromFen, toFen } from "../chess/position";
import { type Line, type Move, type Opening, openingMetaSchema, openingSchema, type Side } from "./schema";

/** Bornes de contenu fixées par CLAUDE.md (« Règles de contenu »). */
export interface ContentLimits {
  minLines: number;
  maxLines: number;
  minPlayerMoves: number;
  maxPlayerMoves: number;
}

export const CONTENT_LIMITS: ContentLimits = {
  minLines: 3,
  maxLines: 8,
  minPlayerMoves: 6,
  maxPlayerMoves: 14,
};

export interface BuildOpeningInput {
  /** Nom du dossier `content/openings/<id>/` : doit correspondre à `meta.id`. */
  folder: string;
  /** Contenu de `meta.json`, déjà parsé en JSON mais pas encore validé. */
  meta: unknown;
  /** Contenu de `lines.pgn`. */
  pgn: string;
  limits?: ContentLimits;
}

/** Erreur de contenu : le message indique l'ouverture et, si possible, la ligne et le coup. */
export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentError";
  }
}

/**
 * Valide le contenu d'une ouverture et le normalise : chaque feuille de
 * l'arbre PGN devient une ligne, chaque coup est rejoué avec chessops.
 *
 * Lève une `ContentError` au premier problème rencontré.
 */
export function buildOpening({ folder, meta: rawMeta, pgn, limits = CONTENT_LIMITS }: BuildOpeningInput): Opening {
  const fail = (message: string): never => {
    throw new ContentError(`[${folder}] ${message}`);
  };

  const parsedMeta = openingMetaSchema.safeParse(rawMeta);
  if (!parsedMeta.success) {
    const issues = parsedMeta.error.issues.map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`);
    return fail(`meta.json invalide :\n  - ${issues.join("\n  - ")}`);
  }
  const meta = parsedMeta.data;
  if (meta.id !== folder) fail(`meta.json : l'id « ${meta.id} » doit être identique au nom du dossier.`);

  const games = parsePgn(pgn);
  if (games.length !== 1 || games[0] === undefined) {
    return fail(`lines.pgn doit contenir exactement une partie (trouvé : ${games.length}).`);
  }
  const game = games[0];
  if (game.headers.has("FEN") || game.headers.has("SetUp")) {
    fail("lines.pgn doit partir de la position initiale (en-têtes FEN/SetUp interdits).");
  }
  if (game.moves.children.length === 0) fail("lines.pgn ne contient aucun coup.");

  const lines = extractLines(game.moves, meta.side, (lineNumber, ply, san, problem) =>
    fail(`ligne ${lineNumber}, coup ${moveLabel(ply, san)} : ${problem}`),
  );

  checkLimits(lines, meta.side, limits, fail);
  checkUniqueNames(lines, fail);
  checkKeyPosition(game.moves, meta.keyPosition, fail);

  const opening = openingSchema.safeParse({ ...meta, lines });
  if (!opening.success) return fail(`contenu généré invalide : ${opening.error.message}`);
  return opening.data;
}

type ReportMoveError = (lineNumber: number, ply: number, san: string, problem: string) => never;

interface PathStep {
  move: Move;
  lineName: string | null;
}

/** Parcourt l'arbre en profondeur (ligne principale d'abord) et renvoie une ligne par feuille. */
function extractLines(root: Node<PgnNodeData>, side: Side, report: ReportMoveError): Line[] {
  const lines: Line[] = [];

  const visit = (node: Node<PgnNodeData>, position: Chess, path: PathStep[]): void => {
    if (node.children.length === 0) {
      lines.push(toLine(path, lines.length + 1));
      return;
    }
    const ply = path.length;
    if (position.turn === side && node.children.length > 1) {
      const sans = node.children.map((child) => child.data.san).join(", ");
      report(
        lines.length + 1,
        ply,
        node.children[0]?.data.san ?? "?",
        `plusieurs coups du joueur au même nœud (${sans}) ; un seul est autorisé.`,
      );
    }
    for (const child of node.children) {
      const step = playNode(position, child, ply, lines.length + 1, report);
      visit(child, step.position, [...path, step.step]);
    }
  };

  visit(root, initialPosition(), []);
  return lines;
}

function playNode(
  position: Chess,
  node: ChildNode<PgnNodeData>,
  ply: number,
  lineNumber: number,
  report: ReportMoveError,
): { position: Chess; step: PathStep } {
  const { san } = node.data;
  const result = playSan(position, san);
  if (result === undefined) return report(lineNumber, ply, san, "coup illégal.");

  const comment = parseAnnotatedComment((node.data.comments ?? []).join(" "));
  return {
    position: result.position,
    step: {
      lineName: comment.lineName,
      move: { ...result.move, comment: comment.text, arrows: comment.arrows, highlights: comment.highlights },
    },
  };
}

function toLine(path: PathStep[], lineNumber: number): Line {
  // Le nom le plus profond l'emporte : une variante nomme sa propre ligne.
  const name = path.reduce<string | null>((current, step) => step.lineName ?? current, null);
  return { name: name ?? `Ligne ${lineNumber}`, moves: path.map((step) => step.move) };
}

function checkLimits(lines: Line[], side: Side, limits: ContentLimits, fail: (message: string) => never): void {
  if (lines.length < limits.minLines || lines.length > limits.maxLines) {
    fail(`${lines.length} ligne(s) : il en faut entre ${limits.minLines} et ${limits.maxLines}.`);
  }
  lines.forEach((line, index) => {
    const playerMoves = line.moves.filter((move) => move.side === side).length;
    if (playerMoves < limits.minPlayerMoves || playerMoves > limits.maxPlayerMoves) {
      fail(
        `ligne ${index + 1} (« ${line.name} ») : ${playerMoves} coup(s) du joueur, ` +
          `il en faut entre ${limits.minPlayerMoves} et ${limits.maxPlayerMoves}.`,
      );
    }
  });
}

function checkUniqueNames(lines: Line[], fail: (message: string) => never): void {
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.name)) fail(`nom de ligne en double : « ${line.name} ».`);
    seen.add(line.name);
  }
}

/** `keyPosition` doit apparaître dans la ligne principale (position initiale comprise). */
function checkKeyPosition(root: Node<PgnNodeData>, keyPosition: string, fail: (message: string) => never): void {
  const target = positionFromFen(keyPosition);
  if (target === undefined) return fail("keyPosition invalide.");
  const key = comparableFen(toFen(target));

  let position = initialPosition();
  if (comparableFen(toFen(position)) === key) return;
  for (const node of root.mainline()) {
    const result = playSan(position, node.san);
    if (result === undefined) break;
    position = result.position;
    if (comparableFen(toFen(position)) === key) return;
  }
  fail(`keyPosition n'est pas atteinte dans la ligne principale : ${keyPosition}`);
}

/** Placement, trait, roques et prise en passant : on ignore les compteurs de coups. */
function comparableFen(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/** « 5. Bc4 » pour les Blancs, « 5... Nf6 » pour les Noirs (`ply` commence à 0). */
function moveLabel(ply: number, san: string): string {
  const number = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${number}. ${san}` : `${number}... ${san}`;
}
