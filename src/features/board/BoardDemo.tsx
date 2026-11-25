"use client";

import { INITIAL_FEN } from "chessops/fen";
import { useEffect, useState } from "react";
import { legalDests, playUci, positionFromFen } from "@/domain/chess/position";
import type { Arrow, Highlight, Side } from "@/domain/content/schema";
import { strings } from "@/lib/strings";
import { Board } from "./Board";
import { moveToUci, needsPromotionChoice } from "./config";

/**
 * Page de démo temporaire (`/demo/board`) : l'utilisateur joue un camp,
 * le programme répond avec le premier coup légal pour montrer l'animation.
 */
const PROMOTION_FEN = "4k3/1P6/8/8/8/8/6p1/4K3 w - - 0 1";
const ITALIAN_FEN = "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
const OPPONENT_DELAY_MS = 500;
const DEMO_ARROWS: Arrow[] = [{ from: "e2", to: "e4", brush: "green" }];
const DEMO_HIGHLIGHTS: Highlight[] = [{ square: "f7", brush: "red" }];

interface DemoState {
  fen: string;
  /** Coups joués depuis la position de départ (UCI). */
  moves: string[];
  showShapes: boolean;
}

export function BoardDemo() {
  const [orientation, setOrientation] = useState<Side>("white");
  const [state, setState] = useState<DemoState>({ fen: INITIAL_FEN, moves: [], showShapes: true });

  const play = (uci: string) => {
    const position = positionFromFen(state.fen);
    const result = position && playUci(position, uci);
    if (result) setState({ fen: result.move.fen, moves: [...state.moves, result.move.uci], showShapes: false });
  };

  // Coup adverse joué automatiquement après un court délai.
  useEffect(() => {
    const position = positionFromFen(state.fen);
    if (position === undefined || position.turn === orientation || position.isEnd()) return;
    const timer = setTimeout(() => {
      const [from, tos] = [...legalDests(position)][0] ?? [];
      const to = tos?.[0];
      if (from === undefined || to === undefined) return;
      const uci = moveToUci(state.fen, from, to, needsPromotionChoice(state.fen, from, to) ? "queen" : undefined);
      const result = uci === undefined ? undefined : playUci(position, uci);
      if (result) {
        setState((current) => ({ fen: result.move.fen, moves: [...current.moves, result.move.uci], showShapes: false }));
      }
    }, OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.fen, orientation]);

  const reset = (fen: string) => setState({ fen, moves: [], showShapes: fen === INITIAL_FEN });

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-[min(90vw,32rem)]">
        <Board
          fen={state.fen}
          orientation={orientation}
          playerColor={orientation}
          onMove={play}
          lastMove={state.moves.at(-1) ?? null}
          arrows={state.showShapes ? DEMO_ARROWS : undefined}
          highlights={state.showShapes ? DEMO_HIGHLIGHTS : undefined}
          ariaLabel={strings.board.ariaLabel}
        />
      </div>
      <p aria-live="polite" className="text-center text-sm">
        {strings.boardDemo.moves}
        {" : "}
        <span data-testid="moves">{state.moves.length > 0 ? state.moves.join(" ") : strings.boardDemo.noMove}</span>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <DemoButton onClick={() => reset(INITIAL_FEN)}>{strings.boardDemo.reset}</DemoButton>
        <DemoButton onClick={() => reset(PROMOTION_FEN)}>{strings.boardDemo.promotionPosition}</DemoButton>
        <DemoButton onClick={() => setOrientation((side) => (side === "white" ? "black" : "white"))}>
          {strings.boardDemo.flip}
        </DemoButton>
      </div>
      <section className="flex flex-col items-center gap-2">
        <h2 className="text-lg font-medium">{strings.boardDemo.miniature}</h2>
        <div className="w-40">
          <Board fen={ITALIAN_FEN} orientation="white" viewOnly ariaLabel={strings.boardDemo.miniatureAriaLabel} />
        </div>
      </section>
    </div>
  );
}

function DemoButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-foreground/30 px-3 py-2 text-sm hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      {children}
    </button>
  );
}
