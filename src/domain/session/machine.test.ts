import { describe, expect, it } from "vitest";
import { initialPosition, playSan } from "../chess/position";
import type { Line, Side } from "../content/schema";
import {
  currentPly,
  initialSessionState,
  isLastLearnLine,
  isLineComplete,
  isOpponentTurn,
  isPlayerTurn,
  lastMove,
  nextMove,
  type SessionContext,
  type SessionEvent,
  type SessionState,
  transition,
} from "./machine";

function line(name: string, sans: string[]): Line {
  let position = initialPosition();
  const moves = sans.map((san) => {
    const result = playSan(position, san);
    if (result === undefined) throw new Error(`Coup illégal dans le test : ${san}`);
    position = result.position;
    return { ...result.move, comment: null, arrows: [], highlights: [] };
  });
  return { name, moves };
}

/** Blancs : e4 (joueur) e5 Nf3 (joueur) Nc6 — deux coups du joueur par ligne. */
const WHITE: SessionContext = {
  side: "white",
  lines: [line("A", ["e4", "e5", "Nf3", "Nc6"]), line("B", ["e4", "c5", "Nf3", "d6"]), line("C", ["e4", "e6", "d4", "d5"])],
};

/** Noirs : l'adversaire ouvre. */
const BLACK: SessionContext = {
  side: "black",
  lines: [line("A", ["e4", "c6", "d4", "d5"]), line("B", ["d4", "d5", "c4", "c6"])],
};

function run(context: SessionContext, events: SessionEvent[], from: SessionState = initialSessionState()): SessionState {
  return events.reduce((state, event) => transition(context, state, event), from);
}

const play = (uci: string): SessionEvent => ({ type: "play", uci });
const advance: SessionEvent = { type: "advance" };
const back: SessionEvent = { type: "back" };
const nextLine: SessionEvent = { type: "next-line" };
const startTraining = (...order: number[]): SessionEvent => ({ type: "start-training", order });

/** Joue toute la ligne sans erreur (coups adverses par `advance`). */
function solve(context: SessionContext, lineIndex: number): SessionEvent[] {
  const target = context.lines[lineIndex];
  if (target === undefined) throw new Error("ligne inconnue");
  return target.moves.map((move) => (move.side === context.side ? play(move.uci) : advance));
}

function expectPhase<P extends SessionState["phase"]>(state: SessionState, phase: P): Extract<SessionState, { phase: P }> {
  expect(state.phase).toBe(phase);
  return state as Extract<SessionState, { phase: P }>;
}

describe("transition — intro", () => {
  it("démarre sur l'intro puis passe à la première ligne d'Apprendre", () => {
    expect(initialSessionState()).toEqual({ phase: "intro" });
    const state = expectPhase(run(WHITE, [{ type: "start-learning" }]), "learn");
    expect(state).toMatchObject({ lineIndex: 0, ply: 0, feedback: { kind: "none" } });
  });

  it("ignore les autres événements et renvoie le même objet", () => {
    const state = initialSessionState();
    expect(transition(WHITE, state, play("e2e4"))).toBe(state);
    expect(transition(WHITE, state, startTraining(0, 1, 2))).toBe(state);
  });
});

describe("transition — Apprendre", () => {
  const learning = run(WHITE, [{ type: "start-learning" }]);

  it("bon coup : avance d'un demi-coup avec le retour « correct »", () => {
    expect(isPlayerTurn(WHITE, learning)).toBe(true);
    const state = expectPhase(transition(WHITE, learning, play("e2e4")), "learn");
    expect(state).toMatchObject({ ply: 1, maxPly: 1, feedback: { kind: "correct" } });
    expect(lastMove(WHITE, state)?.san).toBe("e4");
    expect(isOpponentTurn(WHITE, state)).toBe(true);
  });

  it("mauvais coup : montre le bon coup sans avancer ni pénaliser", () => {
    const state = expectPhase(transition(WHITE, learning, play("d2d4")), "learn");
    expect(state).toMatchObject({ ply: 0, feedback: { kind: "hint", expected: "e2e4" } });
    const after = expectPhase(transition(WHITE, state, play("e2e4")), "learn");
    expect(after).toMatchObject({ ply: 1, feedback: { kind: "correct" } });
  });

  it("joue le coup adverse avec `advance`, mais ne saute pas un coup du joueur non trouvé", () => {
    expect(transition(WHITE, learning, advance)).toBe(learning);
    const state = run(WHITE, [play("e2e4"), advance], learning);
    expect(currentPly(state)).toBe(2);
    expect(lastMove(WHITE, state)?.san).toBe("e5");
    expect(transition(WHITE, state, advance)).toBe(state);
  });

  it("ignore un coup de l'utilisateur quand c'est à l'adversaire", () => {
    const state = run(WHITE, [play("e2e4")], learning);
    expect(transition(WHITE, state, play("e7e5"))).toBe(state);
  });

  it("navigation ← / → : recule jusqu'à la position initiale et réavance jusqu'au coup le plus loin atteint", () => {
    const deep = run(WHITE, [play("e2e4"), advance, play("g1f3")], learning);
    expect(currentPly(deep)).toBe(3);

    const rewound = run(WHITE, [back, back, back, back], deep);
    expect(currentPly(rewound)).toBe(0);
    expect(lastMove(WHITE, rewound)).toBeUndefined();
    expect(expectPhase(rewound, "learn").feedback).toEqual({ kind: "none" });

    const replayed = run(WHITE, [advance, advance, advance], rewound);
    expect(currentPly(replayed)).toBe(3);
    // Le coup adverse suivant (…Nc6) se joue normalement.
    expect(currentPly(transition(WHITE, replayed, advance))).toBe(4);
  });

  it("après un retour en arrière, rejouer le coup du joueur reste possible", () => {
    const state = run(WHITE, [play("e2e4"), back, play("e2e4")], learning);
    expect(expectPhase(state, "learn")).toMatchObject({ ply: 1, maxPly: 1, feedback: { kind: "correct" } });
  });

  it("enchaîne les lignes dans l'ordre une fois chaque ligne finie", () => {
    expect(transition(WHITE, learning, nextLine)).toBe(learning);
    const finished = run(WHITE, solve(WHITE, 0), learning);
    expect(isLineComplete(WHITE, finished)).toBe(true);
    expect(nextMove(WHITE, finished)).toBeUndefined();

    const second = expectPhase(transition(WHITE, finished, nextLine), "learn");
    expect(second).toMatchObject({ lineIndex: 1, ply: 0, maxPly: 0 });

    const last = run(WHITE, [...solve(WHITE, 1), nextLine, ...solve(WHITE, 2)], second);
    expect(isLastLearnLine(WHITE, last)).toBe(true);
    expect(transition(WHITE, last, nextLine)).toBe(last);
  });

  it("côté Noirs : le premier coup est adverse", () => {
    const state = run(BLACK, [{ type: "start-learning" }]);
    expect(isOpponentTurn(BLACK, state)).toBe(true);
    expect(isPlayerTurn(BLACK, state)).toBe(false);
    const after = run(BLACK, [advance, play("c7c6")], state);
    expect(currentPly(after)).toBe(2);
  });
});

describe("transition — S'entraîner", () => {
  const learning = run(WHITE, [{ type: "start-learning" }]);
  const training = run(WHITE, [startTraining(2, 0, 1)], learning);

  it("démarre sur la première ligne de l'ordre fourni, depuis la position initiale", () => {
    const state = expectPhase(training, "train");
    expect(state.queue).toEqual([0, 1]);
    expect(state.current).toMatchObject({ lineIndex: 2, ply: 0, mistakes: 0, failed: false });
    expect(state.attempts).toEqual([]);
  });

  it("refuse un ordre qui n'est pas une permutation des lignes", () => {
    expect(() => transition(WHITE, learning, startTraining(0, 1))).toThrow(/permutation/);
    expect(() => transition(WHITE, learning, startTraining(0, 1, 1))).toThrow(/permutation/);
    expect(() => transition(WHITE, learning, startTraining(0, 1, 3))).toThrow(/permutation/);
  });

  it("bon coup : compté comme trouvé du premier coup", () => {
    const state = expectPhase(transition(WHITE, training, play("e2e4")), "train");
    expect(state.current).toMatchObject({
      ply: 1,
      movesRequested: 1,
      movesFoundFirstTry: 1,
      feedback: { kind: "correct" },
    });
  });

  it("une erreur puis le bon coup : « Pas tout à fait », la ligne n'est pas ratée", () => {
    const once = expectPhase(transition(WHITE, training, play("d2d4")), "train");
    expect(once.current).toMatchObject({ ply: 0, mistakes: 1, failed: false, feedback: { kind: "retry" } });

    const fixed = expectPhase(transition(WHITE, once, play("e2e4")), "train");
    expect(fixed.current).toMatchObject({
      ply: 1,
      mistakes: 0,
      movesRequested: 1,
      movesFoundFirstTry: 0,
      failed: false,
      feedback: { kind: "correct" },
    });
  });

  it("deux erreurs : le bon coup est montré et doit être joué, la ligne est remise en fin de file", () => {
    const twice = expectPhase(run(WHITE, [play("d2d4"), play("c2c4")], training), "train");
    expect(twice.current).toMatchObject({ mistakes: 2, failed: true, feedback: { kind: "reveal", expected: "e2e4" } });

    // Tant que le bon coup n'est pas joué, on reste sur la même position.
    const stillWrong = expectPhase(transition(WHITE, twice, play("g1f3")), "train");
    expect(stillWrong.current).toMatchObject({ ply: 0, mistakes: 2, feedback: { kind: "reveal", expected: "e2e4" } });

    // La ligne continue jusqu'au bout, puis elle est remise en fin de file.
    const done = expectPhase(run(WHITE, [play("e2e4"), advance, play("d2d4"), advance], stillWrong), "train");
    expect(isLineComplete(WHITE, done)).toBe(true);
    expect(done.queue).toEqual([0, 1, 2]);
    expect(done.attempts).toEqual([{ lineIndex: 2, movesRequested: 2, movesFoundFirstTry: 1, failed: true }]);
  });

  it("ligne réussie : enregistrée sans être remise en file", () => {
    const done = expectPhase(run(WHITE, solve(WHITE, 2), training), "train");
    expect(done.queue).toEqual([0, 1]);
    expect(done.attempts).toEqual([{ lineIndex: 2, movesRequested: 2, movesFoundFirstTry: 2, failed: false }]);
  });

  it("`advance` ne joue que les coups adverses et `next-line` attend la fin de la ligne", () => {
    expect(transition(WHITE, training, advance)).toBe(training);
    expect(transition(WHITE, training, nextLine)).toBe(training);
    const opponent = transition(WHITE, training, play("e2e4"));
    expect(transition(WHITE, opponent, play("e7e6"))).toBe(opponent);
  });

  it("`next-line` passe à la tête de file en repartant de zéro", () => {
    const state = expectPhase(run(WHITE, [...solve(WHITE, 2), nextLine], training), "train");
    expect(state.queue).toEqual([1]);
    expect(state.current).toMatchObject({ lineIndex: 0, ply: 0, mistakes: 0, movesRequested: 0, failed: false });
    expect(state.attempts).toHaveLength(1);
  });

  it("côté Noirs : la ligne commence par le coup adverse", () => {
    const state = run(BLACK, [{ type: "start-learning" }, startTraining(1, 0)]);
    expect(isOpponentTurn(BLACK, state)).toBe(true);
    const after = expectPhase(run(BLACK, [advance, play("d7d5")], state), "train");
    expect(after.current).toMatchObject({ ply: 2, movesFoundFirstTry: 1 });
  });
});

describe("transition — fin de session", () => {
  it("se termine quand chaque ligne a été réussie une fois, ratées comprises", () => {
    const fail = (lineIndex: number): SessionEvent[] => {
      const [first, ...rest] = solve(WHITE, lineIndex);
      if (first === undefined) throw new Error("ligne vide");
      return [play("a2a3"), play("a2a4"), first, ...rest];
    };

    let state = run(WHITE, [{ type: "start-learning" }, startTraining(0, 1, 2)]);
    state = run(WHITE, [...fail(0), nextLine, ...solve(WHITE, 1), nextLine, ...fail(2), nextLine], state);
    expect(expectPhase(state, "train").queue).toEqual([2]);
    expect(expectPhase(state, "train").current.lineIndex).toBe(0);

    state = run(WHITE, [...solve(WHITE, 0), nextLine], state);
    const beforeEnd = run(WHITE, solve(WHITE, 2), state);
    expect(expectPhase(beforeEnd, "train").queue).toEqual([]);

    const summary = expectPhase(transition(WHITE, beforeEnd, nextLine), "summary");
    expect(summary.attempts.map((attempt) => [attempt.lineIndex, attempt.failed])).toEqual([
      [0, true],
      [1, false],
      [2, true],
      [0, false],
      [2, false],
    ]);
    expect(isOpponentTurn(WHITE, summary)).toBe(false);
    expect(isPlayerTurn(WHITE, summary)).toBe(false);
  });

  it("« Recommencer » revient à l'intro", () => {
    const summary: SessionState = { phase: "summary", attempts: [] };
    expect(transition(WHITE, summary, { type: "restart" })).toEqual({ phase: "intro" });
    expect(transition(WHITE, summary, play("e2e4"))).toBe(summary);
  });
});

describe("domain/session — pureté", () => {
  it("ne modifie jamais l'état reçu", () => {
    const state = run(WHITE, [{ type: "start-learning" }, startTraining(0, 1, 2)]);
    const snapshot = structuredClone(state);
    run(WHITE, [play("a2a3"), play("a2a4"), ...solve(WHITE, 0), nextLine], state);
    expect(state).toEqual(snapshot);
  });

  it.each<Side>(["white", "black"])("les sélecteurs sont neutres hors Apprendre/S'entraîner (%s)", (side) => {
    const context = side === "white" ? WHITE : BLACK;
    const intro = initialSessionState();
    expect(nextMove(context, intro)).toBeUndefined();
    expect(isLineComplete(context, intro)).toBe(false);
    expect(currentPly(intro)).toBe(0);
  });
});
