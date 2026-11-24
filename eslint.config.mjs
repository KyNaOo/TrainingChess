import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Règle de dépendance : app → features → domain.
 * `domain` ne dépend que de chessops et zod (TypeScript pur, testable sans React).
 */
const domainRestrictedImports = {
  patterns: [
    {
      group: ["react", "react/*", "react-dom", "react-dom/*"],
      message: "src/domain doit rester du TypeScript pur, sans React.",
    },
    {
      group: ["next", "next/*"],
      message: "src/domain ne doit pas dépendre de Next.js.",
    },
    {
      group: ["zustand", "zustand/*", "@lichess-org/chessground", "@lichess-org/chessground/*"],
      message: "src/domain ne dépend que de chessops et zod.",
    },
    {
      group: ["@/app/*", "@/features/*", "@/lib/*", "@/generated/*"],
      message: "src/domain ne doit pas dépendre des couches supérieures (app → features → domain).",
    },
  ],
};

const featuresRestrictedImports = {
  patterns: [
    {
      group: ["@/app/*"],
      message: "src/features ne doit pas dépendre de src/app (app → features → domain).",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", domainRestrictedImports],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "src/domain ne doit pas accéder au DOM." },
        { name: "document", message: "src/domain ne doit pas accéder au DOM." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Injecter le temps en paramètre dans src/domain." },
        { object: "Math", property: "random", message: "Injecter l'aléatoire en paramètre dans src/domain." },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", featuresRestrictedImports],
    },
  },
  {
    // Aucun texte d'interface en dur dans le JSX : tout passe par src/lib/strings.ts.
    files: ["src/app/**/*.tsx", "src/features/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: false, ignoreProps: true }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
