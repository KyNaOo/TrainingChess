import { positionFromFen } from "./position";

/**
 * Vrai si `fen` est une FEN complète (6 champs) décrivant une position
 * d'échecs standard légale : un roi par camp, camp qui n'a pas le trait pas
 * en échec, droits de roque et case de prise en passant cohérents.
 */
export function isLegalFen(fen: string): boolean {
  if (fen.trim().split(/\s+/).length !== 6) return false;
  return positionFromFen(fen) !== undefined;
}
