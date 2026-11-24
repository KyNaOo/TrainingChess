import { Chess } from "chessops/chess";
import { parseFen } from "chessops/fen";

/**
 * Vrai si `fen` est une FEN complète (6 champs) décrivant une position
 * d'échecs standard légale : un roi par camp, camp au trait non en échec
 * impossible, droits de roque et case de prise en passant cohérents.
 */
export function isLegalFen(fen: string): boolean {
  if (fen.trim().split(/\s+/).length !== 6) return false;
  const setup = parseFen(fen);
  if (setup.isErr) return false;
  return Chess.fromSetup(setup.value).isOk;
}
