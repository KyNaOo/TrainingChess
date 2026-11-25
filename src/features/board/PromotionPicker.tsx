"use client";

import { useEffect, useRef } from "react";
import type { Side } from "@/domain/content/schema";
import { strings } from "@/lib/strings";
import { PROMOTION_ROLES, type PromotionRole } from "./config";

const GLYPHS: Record<Side, Record<PromotionRole, string>> = {
  white: { queen: "♕", rook: "♖", bishop: "♗", knight: "♘" },
  black: { queen: "♛", rook: "♜", bishop: "♝", knight: "♞" },
};

interface PromotionPickerProps {
  color: Side;
  onSelect: (role: PromotionRole) => void;
  onCancel: () => void;
}

/** Choix de la pièce de promotion, affiché par-dessus l'échiquier. Échap annule. */
export function PromotionPicker({ color, onSelect, onCancel }: PromotionPickerProps) {
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={strings.board.promotion.title}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/50"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="flex flex-col gap-2 rounded-lg bg-white p-3 text-neutral-900 shadow-xl">
        <p className="text-sm font-medium">{strings.board.promotion.title}</p>
        <div className="grid grid-cols-4 gap-2">
          {PROMOTION_ROLES.map((role, index) => (
            <button
              key={role}
              ref={index === 0 ? firstButton : undefined}
              type="button"
              aria-label={strings.board.promotion.roles[role]}
              title={strings.board.promotion.roles[role]}
              className="flex size-14 items-center justify-center rounded-md border border-neutral-300 text-4xl leading-none hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={() => onSelect(role)}
            >
              <span aria-hidden="true">{GLYPHS[color][role]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm underline hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          onClick={onCancel}
        >
          {strings.board.promotion.cancel}
        </button>
      </div>
    </div>
  );
}
