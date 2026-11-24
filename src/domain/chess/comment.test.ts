import { describe, expect, it } from "vitest";
import { parseAnnotatedComment } from "./comment";

describe("parseAnnotatedComment", () => {
  it("garde un commentaire simple tel quel", () => {
    expect(parseAnnotatedComment("Le cavalier attaque e5.")).toEqual({
      lineName: null,
      text: "Le cavalier attaque e5.",
      arrows: [],
      highlights: [],
    });
  });

  it("extrait les flèches de [%cal] avec leurs couleurs", () => {
    const { arrows, text } = parseAnnotatedComment("[%cal Ge2e4,Rd8d1,Yb1c3,Bf1c4]");
    expect(arrows).toEqual([
      { from: "e2", to: "e4", brush: "green" },
      { from: "d8", to: "d1", brush: "red" },
      { from: "b1", to: "c3", brush: "yellow" },
      { from: "f1", to: "c4", brush: "blue" },
    ]);
    expect(text).toBeNull();
  });

  it("extrait les cases surlignées de [%csl]", () => {
    expect(parseAnnotatedComment("[%csl Gd5,Rf7]").highlights).toEqual([
      { square: "d5", brush: "green" },
      { square: "f7", brush: "red" },
    ]);
  });

  it("sépare le texte des annotations mêlées au milieu du commentaire", () => {
    expect(
      parseAnnotatedComment("Le fou vise f7. [%cal Gc4f7] C'est le point faible noir. [%csl Rf7]"),
    ).toEqual({
      lineName: null,
      text: "Le fou vise f7. C'est le point faible noir.",
      arrows: [{ from: "c4", to: "f7", brush: "green" }],
      highlights: [{ square: "f7", brush: "red" }],
    });
  });

  it("retire les autres annotations Lichess ([%clk], [%eval])", () => {
    expect(parseAnnotatedComment("[%clk 0:05:00] Centre solide. [%eval 0.25]").text).toBe("Centre solide.");
  });

  it.each([
    ["tiret cadratin", "# Giuoco Pianissimo — Les Blancs jouent d3 et un jeu lent."],
    ["tiret cadratin collé", "# Giuoco Pianissimo—Les Blancs jouent d3 et un jeu lent."],
    ["demi-cadratin", "# Giuoco Pianissimo – Les Blancs jouent d3 et un jeu lent."],
    ["trait d'union entouré d'espaces", "# Giuoco Pianissimo - Les Blancs jouent d3 et un jeu lent."],
  ])("extrait le nom de ligne (%s)", (_, raw) => {
    expect(parseAnnotatedComment(raw)).toMatchObject({
      lineName: "Giuoco Pianissimo",
      text: "Les Blancs jouent d3 et un jeu lent.",
    });
  });

  it("ne coupe pas un nom de ligne composé avec trait d'union", () => {
    expect(parseAnnotatedComment("# Caro-Kann Avance — Les Blancs gagnent de l'espace.")).toMatchObject({
      lineName: "Caro-Kann Avance",
      text: "Les Blancs gagnent de l'espace.",
    });
  });

  it("accepte un nom de ligne sans texte", () => {
    expect(parseAnnotatedComment("#  Attaque Fried Liver ")).toMatchObject({
      lineName: "Attaque Fried Liver",
      text: null,
    });
  });

  it("combine nom de ligne, texte et annotations", () => {
    expect(
      parseAnnotatedComment("[%cal Gd2d3] # Giuoco Pianissimo — Jeu lent avec d3. [%csl Gd3]"),
    ).toEqual({
      lineName: "Giuoco Pianissimo",
      text: "Jeu lent avec d3.",
      arrows: [{ from: "d2", to: "d3", brush: "green" }],
      highlights: [{ square: "d3", brush: "green" }],
    });
  });

  it("n'interprète pas un # au milieu du texte comme un nom de ligne", () => {
    expect(parseAnnotatedComment("Après Qh4# la partie est finie.")).toMatchObject({
      lineName: null,
      text: "Après Qh4# la partie est finie.",
    });
  });

  it("renvoie un texte nul pour un commentaire vide", () => {
    expect(parseAnnotatedComment("   ").text).toBeNull();
  });
});
