import { z } from "zod";
import { isLegalFen } from "../chess/fen";

/**
 * Schémas du contenu.
 *
 * - `openingMetaSchema` valide `content/openings/<id>/meta.json` (saisi à la main).
 * - `openingSchema` / `openingsSchema` décrivent `src/generated/openings.json`,
 *   produit par `pnpm content:build` et lu par l'interface.
 *
 * Les types TypeScript sont dérivés des schémas (`z.infer`) : une seule source de vérité.
 */

export const sideSchema = z.enum(["white", "black"]);
export const levelSchema = z.enum(["beginner", "intermediate", "advanced"]);

/** Couleurs d'annotation des études Lichess : G, R, Y, B dans `[%cal]` / `[%csl]`. */
export const brushSchema = z.enum(["green", "red", "yellow", "blue"]);

export const squareSchema = z.string().regex(/^[a-h][1-8]$/, "Case invalide (attendu : a1 à h8)");

export const uciSchema = z
  .string()
  .regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/, "Coup UCI invalide (attendu : e2e4, e7e8q…)");

export const fenSchema = z.string().refine(isLegalFen, "FEN invalide ou position illégale");

const nonEmptyText = z.string().trim().min(1, "Texte vide");

export const openingIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Identifiant attendu en kebab-case (ex. italian-game)");

export const ecoCodeSchema = z.string().regex(/^[A-E][0-9]{2}$/, "Code ECO invalide (attendu : A00 à E99)");

export const openingMetaSchema = z.strictObject({
  id: openingIdSchema,
  name: nonEmptyText,
  eco: z.array(ecoCodeSchema).min(1),
  side: sideSchema,
  level: levelSchema,
  /** Rang d'affichage sur le tableau de bord : 1 = la plus populaire. */
  popularity: z.int().positive(),
  keyPosition: fenSchema,
  summary: nonEmptyText,
  keyIdeas: z.array(nonEmptyText).min(1),
  pawnStructures: nonEmptyText,
  typicalPlans: z.strictObject({
    white: nonEmptyText,
    black: nonEmptyText,
  }),
  reviewed: z.boolean(),
});

export const arrowSchema = z.strictObject({
  from: squareSchema,
  to: squareSchema,
  brush: brushSchema,
});

export const highlightSchema = z.strictObject({
  square: squareSchema,
  brush: brushSchema,
});

export const moveSchema = z.strictObject({
  uci: uciSchema,
  san: nonEmptyText,
  /** Position après le coup. */
  fen: fenSchema,
  /** Camp qui joue ce coup. */
  side: sideSchema,
  /** Explication affichée dans l'étape « Apprendre », sans les annotations `[%…]`. */
  comment: nonEmptyText.nullable(),
  arrows: z.array(arrowSchema),
  highlights: z.array(highlightSchema),
});

export const lineSchema = z.strictObject({
  /** Nom tiré du commentaire `# Nom — …`, ou nom par défaut fourni par le build. */
  name: nonEmptyText,
  moves: z.array(moveSchema).min(1),
});

export const openingSchema = openingMetaSchema.extend({
  lines: z.array(lineSchema).min(1),
});

export const openingsSchema = z.array(openingSchema);

export type Side = z.infer<typeof sideSchema>;
export type Level = z.infer<typeof levelSchema>;
export type Brush = z.infer<typeof brushSchema>;
export type OpeningMeta = z.infer<typeof openingMetaSchema>;
export type Arrow = z.infer<typeof arrowSchema>;
export type Highlight = z.infer<typeof highlightSchema>;
export type Move = z.infer<typeof moveSchema>;
export type Line = z.infer<typeof lineSchema>;
export type Opening = z.infer<typeof openingSchema>;
