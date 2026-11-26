import type { TrainAttempt } from "./machine";

/** Ligne ratée au moins une fois pendant l'entraînement. */
export interface FailedLine {
  lineIndex: number;
  /** Nombre de passages ratés sur cette ligne. */
  failures: number;
}

export interface SessionScore {
  /** Coups du joueur demandés sur toute la session, passages répétés compris. */
  movesRequested: number;
  /** Coups trouvés sans aucune erreur. */
  movesFoundFirstTry: number;
  /** `movesFoundFirstTry / movesRequested`, entre 0 et 1 ; `null` si aucun coup n'a été demandé. */
  successRate: number | null;
  /** Lignes ratées au moins une fois, de la plus ratée à la moins ratée (puis dans l'ordre des lignes). */
  failedLines: FailedLine[];
}

/** Score de fin de session, calculé à partir des lignes jouées pendant l'entraînement. */
export function computeScore(attempts: readonly TrainAttempt[]): SessionScore {
  let movesRequested = 0;
  let movesFoundFirstTry = 0;
  const failures = new Map<number, number>();

  for (const attempt of attempts) {
    movesRequested += attempt.movesRequested;
    movesFoundFirstTry += attempt.movesFoundFirstTry;
    if (attempt.failed) failures.set(attempt.lineIndex, (failures.get(attempt.lineIndex) ?? 0) + 1);
  }

  const failedLines = [...failures]
    .map(([lineIndex, count]) => ({ lineIndex, failures: count }))
    .sort((a, b) => b.failures - a.failures || a.lineIndex - b.lineIndex);

  return {
    movesRequested,
    movesFoundFirstTry,
    successRate: movesRequested === 0 ? null : movesFoundFirstTry / movesRequested,
    failedLines,
  };
}
