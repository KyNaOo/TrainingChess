/**
 * File d'entraînement : ordre initial mélangé et remise en fin de file.
 *
 * L'aléatoire est déterministe et injecté par une graine : même graine,
 * même ordre. C'est l'appelant (l'interface) qui choisit la graine ;
 * aucun `Math.random()` ici.
 */

/** Générateur pseudo-aléatoire : chaque appel renvoie un nombre dans [0, 1). */
export type Random = () => number;

/**
 * PRNG déterministe (mulberry32) : rapide, sans dépendance, et largement
 * suffisant pour mélanger quelques lignes. La graine est ramenée à un entier
 * 32 bits non signé.
 */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates ; renvoie un nouveau tableau, l'entrée n'est pas modifiée. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}

/** Ordre initial de l'entraînement : toutes les lignes (indices 0 à `lineCount - 1`), mélangées. */
export function initialTrainingOrder(lineCount: number, seed: number): number[] {
  const indices = Array.from({ length: lineCount }, (_, index) => index);
  return shuffle(indices, createRandom(seed));
}

/** Remet une ligne ratée en fin de file. */
export function requeue(queue: readonly number[], lineIndex: number): number[] {
  return [...queue, lineIndex];
}

/** Prochaine ligne et reste de la file, ou `undefined` si la file est vide (fin de l'entraînement). */
export function dequeue(queue: readonly number[]): { lineIndex: number; rest: number[] } | undefined {
  const [lineIndex, ...rest] = queue;
  return lineIndex === undefined ? undefined : { lineIndex, rest };
}
