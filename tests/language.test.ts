import { describe, expect, it } from "vitest";
import { detectCourseLanguage } from "../src/lib/language";

describe("detectCourseLanguage", () => {
  it("détecte un cours rédigé en français même si le profil est anglais", () => {
    const text = `La photosynthèse est le processus par lequel les plantes utilisent la lumière.
      Dans les cellules végétales, la chlorophylle permet de transformer cette énergie.
      Les molécules produites sont utilisées pour la croissance et le fonctionnement de la plante.
      Cette réaction se déroule principalement dans les feuilles et nécessite du dioxyde de carbone.`;
    expect(detectCourseLanguage(text, "en")).toBe("fr");
  });

  it("détecte un cours rédigé en anglais même si le profil est français", () => {
    const text = `Photosynthesis is the process by which plants use light energy.
      In plant cells, chlorophyll helps transform this energy into chemical energy.
      The molecules that are produced support the growth and function of the plant.
      This reaction occurs mainly in the leaves and requires carbon dioxide.`;
    expect(detectCourseLanguage(text, "fr")).toBe("en");
  });
});
