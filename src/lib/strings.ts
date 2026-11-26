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

  /** Page d'une ouverture (`/openings/[id]`). */
  session: {
    playing: "Vous jouez les",
    backToOpenings: "Toutes les ouvertures",
    stepsLabel: "Étapes de la session",
  },

  /** Étape « Comprendre ». */
  understand: {
    keyIdeas: "Idées clés",
    pawnStructures: "Structures de pions",
    typicalPlans: "Plans typiques",
    yourSide: "(votre camp)",
    keyPosition: "Position caractéristique",
    start: "Commencer à apprendre les lignes",
  },

  notFound: {
    title: "Page introuvable",
    description: "Cette ouverture n'existe pas, ou l'adresse est incorrecte.",
    backToOpenings: "Retour aux ouvertures",
  },

  /** Étape « Apprendre ». */
  learn: {
    line: "Ligne",
    startPosition: "Position de départ",
    yourMove: "À vous de jouer : trouvez le coup suivant.",
    opponentMove: "L'adversaire joue…",
    hint: "Pas tout à fait : la flèche montre le bon coup.",
    lineComplete: "Ligne terminée.",
    nextLine: "Ligne suivante",
    startTraining: "Passer à l'entraînement",
    previous: "Coup précédent",
    next: "Coup suivant",
    previousIcon: "←",
    nextIcon: "→",
    keyboardHint: "Les touches ← et → permettent de revoir les coups.",
  },

  /** Retours sur un coup, annoncés via `aria-live`. */
  feedback: {
    correct: "Bon coup",
    incorrect: "Pas tout à fait",
  },

  board: {
    ariaLabel: "Échiquier",
    promotion: {
      title: "Promotion : choisir une pièce",
      cancel: "Annuler la promotion",
      roles: {
        queen: "Dame",
        rook: "Tour",
        bishop: "Fou",
        knight: "Cavalier",
      },
    },
  },

  /** Page de démo temporaire de l'échiquier (`/demo/board`), retirée avec la session complète. */
  boardDemo: {
    title: "Démo de l'échiquier",
    description: "Page temporaire pour tester l'échiquier à la main : coups, promotion, flèches et miniature.",
    reset: "Position initiale",
    promotionPosition: "Position de promotion",
    flip: "Retourner l'échiquier",
    moves: "Coups joués",
    noMove: "aucun",
    miniature: "Miniature (lecture seule)",
    miniatureAriaLabel: "Échiquier miniature : Partie italienne",
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
