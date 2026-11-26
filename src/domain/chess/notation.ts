import type { SquareName } from "chessops/types";

/** « 5. Bc4 » pour les Blancs, « 5... Nf6 » pour les Noirs (`ply` = demi-coups joués avant ce coup, à partir de 0). */
export function moveLabel(ply: number, san: string): string {
  const number = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${number}. ${san}` : `${number}... ${san}`;
}

/** Cases de départ et d'arrivée d'un coup UCI (`e2e4`, `e7e8q`), ou `undefined` s'il est mal formé. */
export function uciSquares(uci: string): { from: SquareName; to: SquareName } | undefined {
  const match = /^([a-h][1-8])([a-h][1-8])[qrbn]?$/.exec(uci);
  if (match === null) return undefined;
  return { from: match[1] as SquareName, to: match[2] as SquareName };
}
