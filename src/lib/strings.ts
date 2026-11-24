/**
 * Toutes les chaînes affichées à l'utilisateur.
 *
 * Règle : aucun texte d'interface en dur dans le JSX. Les composants de
 * `src/app` et `src/features` lisent leurs textes ici (règle ESLint
 * `react/jsx-no-literals`). Les attributs visibles ou lus par les lecteurs
 * d'écran (`aria-label`, `title`, `alt`, `placeholder`) viennent aussi d'ici.
 *
 * Les clés sont en anglais (code), les valeurs en français (interface).
 */
export const strings = {
  site: {
    name: "Opening Trainer",
    tagline: "Apprendre une ouverture d'échecs en une session.",
    description: "Apprendre une ouverture d'échecs en une session, gratuitement et sans compte.",
  },

  /** Camp joué par l'utilisateur dans l'ouverture. */
  sides: {
    white: "Blancs",
    black: "Noirs",
  },

  levels: {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  },

  /** Libellés des étapes de la session. */
  steps: {
    understand: "Comprendre",
    learn: "Apprendre",
    train: "S'entraîner",
    summary: "Bilan",
  },

  /** Retours sur un coup, annoncés via `aria-live`. */
  feedback: {
    correct: "Bon coup",
    incorrect: "Pas tout à fait",
  },

  review: {
    pendingBadge: "Contenu en cours de relecture",
  },

  summary: {
    successRate: "Taux de réussite",
    mostMissedLines: "Lignes les plus ratées",
    restart: "Recommencer",
    chooseAnotherOpening: "Choisir une autre ouverture",
  },
} as const;

export type Strings = typeof strings;
