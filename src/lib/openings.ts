import { type Opening, openingsSchema } from "@/domain/content/schema";
import generated from "@/generated/openings.json";

/**
 * Contenu compilé par `pnpm content:build`, revalidé au chargement : une
 * erreur de génération fait échouer le build plutôt que d'arriver à l'écran.
 */
const openings: readonly Opening[] = openingsSchema.parse(generated);

/** Toutes les ouvertures, par popularité. */
export function getOpenings(): readonly Opening[] {
  return openings;
}

export function getOpening(id: string): Opening | undefined {
  return openings.find((opening) => opening.id === id);
}
