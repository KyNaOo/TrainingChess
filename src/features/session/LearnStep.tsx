"use client";

import { useEffect, useMemo } from "react";
import { moveLabel, uciSquares } from "@/domain/chess/notation";
import type { Arrow, Opening } from "@/domain/content/schema";
import {
  canGoBack,
  canGoForward,
  currentFen,
  isLastLearnLine,
  isLineComplete,
  isOpponentTurn,
  isPlayerTurn,
  lastMove,
  type SessionEvent,
  type SessionState,
} from "@/domain/session/machine";
import { Board } from "@/features/board/Board";
import { strings } from "@/lib/strings";

type LearnState = Extract<SessionState, { phase: "learn" }>;

export interface LearnStepProps {
  opening: Opening;
  state: LearnState;
  dispatch: (event: SessionEvent) => void;
  onStartTraining: () => void;
}

/** Vrai si la touche vient d'un champ de saisie : on ne détourne pas ses flèches. */
function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

const buttonClass =
  "rounded-md px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

/**
 * Étape « Apprendre » : les lignes dans l'ordre, coup par coup. Les coups
 * adverses sont joués par l'autoplay de `SessionView` ; ici on affiche le coup
 * courant, son explication et ses annotations, et on attend le coup du joueur.
 */
export function LearnStep({ opening, state, dispatch, onStartTraining }: LearnStepProps) {
  const line = opening.lines[state.lineIndex];
  const move = lastMove(opening, state);
  const complete = isLineComplete(opening, state);
  const playerTurn = isPlayerTurn(opening, state);
  const backEnabled = canGoBack(state);
  const forwardEnabled = canGoForward(opening, state);

  const hintArrows = useMemo<readonly Arrow[] | null>(() => {
    if (state.feedback.kind !== "hint") return null;
    const squares = uciSquares(state.feedback.expected);
    return squares === undefined ? null : [{ ...squares, brush: "green" }];
  }, [state.feedback]);

  // Navigation clavier ← / →.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        dispatch({ type: "back" });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        dispatch({ type: "advance" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  if (line === undefined) return null;

  const feedbackText =
    state.feedback.kind === "correct" && move !== undefined
      ? `${strings.feedback.correct} : ${moveLabel(state.ply - 1, move.san)}`
      : state.feedback.kind === "hint"
        ? strings.learn.hint
        : "";

  const prompt = complete
    ? strings.learn.lineComplete
    : playerTurn
      ? strings.learn.yourMove
      : isOpponentTurn(opening, state)
        ? strings.learn.opponentMove
        : "";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
      <div className="w-full">
        <Board
          fen={currentFen(opening, state)}
          orientation={opening.side}
          ariaLabel={strings.board.ariaLabel}
          playerColor={playerTurn ? opening.side : undefined}
          onMove={(uci) => dispatch({ type: "play", uci })}
          lastMove={move?.uci ?? null}
          arrows={hintArrows ?? move?.arrows}
          highlights={hintArrows === null ? move?.highlights : undefined}
        />
      </div>

      <div className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-foreground/70" data-testid="line-progress">
            {`${strings.learn.line} ${state.lineIndex + 1} / ${opening.lines.length}`}
          </p>
          <h2 className="text-xl font-semibold">{line.name}</h2>
        </header>

        <p className="text-foreground/80">{prompt}</p>

        <p
          role="status"
          aria-live="polite"
          data-testid="feedback"
          data-kind={state.feedback.kind}
          className={
            "min-h-6 font-semibold " + (state.feedback.kind === "hint" ? "text-amber-700" : "text-emerald-700")
          }
        >
          {feedbackText}
        </p>

        <section className="flex min-h-20 flex-col gap-2 rounded-md bg-foreground/5 p-4" data-testid="explanation">
          <p className="font-semibold tabular-nums">
            {move === undefined ? strings.learn.startPosition : moveLabel(state.ply - 1, move.san)}
          </p>
          {move?.comment != null && <p className="leading-relaxed">{move.comment}</p>}
        </section>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "back" })}
            disabled={!backEnabled}
            aria-label={strings.learn.previous}
            title={strings.learn.previous}
            className={`${buttonClass} flex-1 border border-foreground/20 disabled:opacity-40`}
          >
            {strings.learn.previousIcon}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "advance" })}
            disabled={!forwardEnabled}
            aria-label={strings.learn.next}
            title={strings.learn.next}
            className={`${buttonClass} flex-1 border border-foreground/20 disabled:opacity-40`}
          >
            {strings.learn.nextIcon}
          </button>
        </div>
        <p className="hidden text-sm text-foreground/70 md:block">{strings.learn.keyboardHint}</p>

        {complete && (
          <button
            type="button"
            onClick={isLastLearnLine(opening, state) ? onStartTraining : () => dispatch({ type: "next-line" })}
            className={`${buttonClass} bg-emerald-700 py-3 text-white hover:bg-emerald-800`}
          >
            {isLastLearnLine(opening, state) ? strings.learn.startTraining : strings.learn.nextLine}
          </button>
        )}
      </div>
    </div>
  );
}
