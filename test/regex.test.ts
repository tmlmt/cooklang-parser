import { describe, it, expect } from "vitest";
import { tokensRegex } from "../src/regex"; // adjust path

describe("tokensRegex", () => {
  it("matches a single-word ingredient", () => {
    const input = "@tomato";
    const match = input.match(tokensRegex);
    expect(match).not.toBeNull();
    expect(match?.groups?.sIngredientName).toBe("tomato");
  });

  it("matches a multiword ingredient with quantity and units", () => {
    const input = "@red onion{2%pieces}(chopped)";
    const match = input.match(tokensRegex);
    expect(match).not.toBeNull();
    expect(match?.groups?.mIngredientName).toBe("red onion");
    expect(match?.groups?.mIngredientQuantity).toBe("2");
    expect(match?.groups?.mIngredientUnits).toBe("pieces");
    expect(match?.groups?.mIngredientPreparation).toBe("chopped");
  });

  it("matches a single-word cookware with quantity", () => {
    const input = "#pan{1}";
    const match = input.match(tokensRegex);
    expect(match).not.toBeNull();
    expect(match?.groups?.sCookwareName).toBe("pan");
    expect(match?.groups?.sCookwareQuantity).toBe("1");
  });

  it("matches a multiword cookware with quantity", () => {
    const input = "#mixing bowl{large}";
    const match = input.match(tokensRegex);
    expect(match).not.toBeNull();
    expect(match?.groups?.mCookwareName).toBe("mixing bowl");
    expect(match?.groups?.mCookwareQuantity).toBe("large");
  });

  it("matches a timer with quantity and units", () => {
    const input = "~Bake{20%minutes}";
    const match = input.match(tokensRegex);
    expect(match).not.toBeNull();
    expect(match?.groups?.timerName).toBe("Bake");
    expect(match?.groups?.timerQuantity).toBe("20");
    expect(match?.groups?.timerUnits).toBe("minutes");
  });

  it("matches multiple tokens in one string", () => {
    const input = "@egg{2} #pan{1} ~Boil{5%min}";
    const matches = [...input.matchAll(tokensRegex)];
    expect(matches.length).toBe(3);
    expect(matches[0]!.groups?.sIngredientName).toBe("egg");
    expect(matches[1]!.groups?.sCookwareName).toBe("pan");
    expect(matches[2]!.groups?.timerName).toBe("Boil");
  });

  it("matches ingredient with @@ modifier", () => {
    const input = "@@doubleat";
    const match = input.match(tokensRegex);
    expect(match).not.toBeNull();
    expect(match?.groups?.sIngredientModifier).toBe("@");
    expect(match?.groups?.sIngredientName).toBe("doubleat");
  });

  it("does not match just a bare @", () => {
    const input = "@";
    const match = input.match(tokensRegex);
    expect(match).toBeNull();
  });

  it("does not match just a bare #", () => {
    const input = "#";
    const match = input.match(tokensRegex);
    expect(match).toBeNull();
  });
});
