import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * Garde-fou de la règle de dépendance app → features → domain :
 * on vérifie que la configuration ESLint rejette les imports interdits.
 */
const eslint = new ESLint();

async function ruleIdsFor(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.map((message) => message.ruleId ?? "") ?? [];
}

describe("règle de dépendance de src/domain", () => {
  it.each([
    'import { useState } from "react";',
    'import Link from "next/link";',
    'import { create } from "zustand";',
    'import { Board } from "@/features/board/Board";',
  ])("rejette %s", async (code) => {
    const ruleIds = await ruleIdsFor(`${code}\nexport {};\n`, "src/domain/example.ts");
    expect(ruleIds).toContain("no-restricted-imports");
  });

  it("rejette Math.random et Date.now", async () => {
    const ruleIds = await ruleIdsFor(
      "export const seed = Math.random() + Date.now();\n",
      "src/domain/example.ts",
    );
    expect(ruleIds.filter((id) => id === "no-restricted-properties")).toHaveLength(2);
  });

  it("autorise chessops et zod", async () => {
    const ruleIds = await ruleIdsFor(
      'import { z } from "zod";\nimport { Chess } from "chessops/chess";\nexport const schema = z.string();\nexport type Game = Chess;\n',
      "src/domain/example.ts",
    );
    expect(ruleIds).not.toContain("no-restricted-imports");
  });
});

describe("règle de dépendance de src/features", () => {
  it("rejette un import depuis src/app", async () => {
    const ruleIds = await ruleIdsFor(
      'import Page from "@/app/page";\nexport { Page };\n',
      "src/features/example.ts",
    );
    expect(ruleIds).toContain("no-restricted-imports");
  });
});

describe("textes d'interface centralisés", () => {
  it.each(["src/app/example.tsx", "src/features/example.tsx"])(
    "rejette un texte en dur dans le JSX de %s",
    async (filePath) => {
      const ruleIds = await ruleIdsFor(
        "export const Title = () => <h1>Bon coup</h1>;\n",
        filePath,
      );
      expect(ruleIds).toContain("react/jsx-no-literals");
    },
  );

  it("autorise les chaînes lues depuis src/lib/strings", async () => {
    const ruleIds = await ruleIdsFor(
      'import { strings } from "@/lib/strings";\nexport const Title = () => <h1 className="text-xl">{strings.feedback.correct}</h1>;\n',
      "src/features/example.tsx",
    );
    expect(ruleIds).not.toContain("react/jsx-no-literals");
  });
});
