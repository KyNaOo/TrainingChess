"use client";

import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";
import "./board.css";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Key } from "@lichess-org/chessground/types";
import { useEffect, useRef, useState } from "react";
import { positionFromFen } from "@/domain/chess/position";
import type { Arrow, Highlight, Side } from "@/domain/content/schema";
import { type BoardView, buildBoardConfig, moveToUci, needsPromotionChoice, type PromotionRole } from "./config";
import { PromotionPicker } from "./PromotionPicker";

const NO_ARROWS: readonly Arrow[] = [];
const NO_HIGHLIGHTS: readonly Highlight[] = [];

export interface BoardProps {
  /** Position affichée. Changer la FEN anime le passage d'une position à l'autre. */
  fen: string;
  orientation: Side;
  /** Nom accessible de l'échiquier. */
  ariaLabel: string;
  /** Camp que l'utilisateur peut jouer quand c'est son tour ; absent = aucun coup. */
  playerColor?: Side;
  /**
   * Coup joué par l'utilisateur (UCI standard). Le parent décide : s'il met à
   * jour `fen`, le coup reste ; sinon l'échiquier revient à `fen`.
   */
  onMove?: (uci: string) => void;
  arrows?: readonly Arrow[];
  highlights?: readonly Highlight[];
  /** Dernier coup joué (UCI), surligné. */
  lastMove?: string | null;
  /** Miniature non interactive (cartes du tableau de bord). */
  viewOnly?: boolean;
  className?: string;
}

interface PendingPromotion {
  from: Key;
  to: Key;
}

/** Échiquier chessground : interactif ou miniature, carré et responsive. */
export function Board({
  fen,
  orientation,
  ariaLabel,
  playerColor,
  onMove,
  arrows = NO_ARROWS,
  highlights = NO_HIGHLIGHTS,
  lastMove = null,
  viewOnly = false,
  className = "",
}: BoardProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const view: BoardView = {
    fen,
    orientation,
    playerColor: playerColor ?? null,
    viewOnly,
    arrows,
    highlights,
    lastMove,
  };
  // Dernière vue connue : sert à la création de l'instance (coordonnées et
  // mode lecture seule ne sont pris en compte qu'à ce moment par chessground).
  const viewRef = useRef(view);
  const fenRef = useRef(fen);
  const onMoveRef = useRef(onMove);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  // Incrémenté après chaque coup de l'utilisateur pour resynchroniser l'échiquier avec `fen`.
  const [moveCount, setMoveCount] = useState(0);
  const submitRef = useRef<(uci: string | undefined) => void>(() => undefined);

  useEffect(() => {
    viewRef.current = view;
    fenRef.current = fen;
    onMoveRef.current = onMove;
  });

  // Création unique de l'instance chessground, détruite au démontage.
  useEffect(() => {
    const element = elementRef.current;
    if (element === null) return;

    const submit = (uci: string | undefined) => {
      if (uci !== undefined) onMoveRef.current?.(uci);
      setMoveCount((count) => count + 1);
    };

    const initial = buildBoardConfig(viewRef.current);
    const api = Chessground(element, {
      ...initial,
      movable: {
        ...initial.movable,
        events: {
          after: (from, to) => {
            if (needsPromotionChoice(fenRef.current, from, to)) {
              setPendingPromotion({ from, to });
              return;
            }
            submit(moveToUci(fenRef.current, from, to));
          },
        },
      },
    });
    apiRef.current = api;
    submitRef.current = submit;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  // Synchronise l'échiquier avec les props (et le ramène à `fen` après un coup refusé).
  // Pendant le choix de promotion, le pion reste sur sa case d'arrivée.
  useEffect(() => {
    if (pendingPromotion !== null) return;
    apiRef.current?.set(
      buildBoardConfig({
        fen,
        orientation,
        playerColor: playerColor ?? null,
        viewOnly,
        arrows,
        highlights,
        lastMove,
      }),
    );
  }, [fen, orientation, playerColor, viewOnly, arrows, highlights, lastMove, pendingPromotion, moveCount]);

  const choosePromotion = (role: PromotionRole) => {
    if (pendingPromotion === null) return;
    setPendingPromotion(null);
    submitRef.current(moveToUci(fenRef.current, pendingPromotion.from, pendingPromotion.to, role));
  };

  const cancelPromotion = () => {
    setPendingPromotion(null);
    setMoveCount((count) => count + 1);
  };

  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <div
        ref={elementRef}
        role={viewOnly ? "img" : "application"}
        aria-label={ariaLabel}
        className="h-full w-full"
      />
      {pendingPromotion !== null && (
        <PromotionPicker
          color={positionFromFen(fen)?.turn ?? "white"}
          onSelect={choosePromotion}
          onCancel={cancelPromotion}
        />
      )}
    </div>
  );
}
