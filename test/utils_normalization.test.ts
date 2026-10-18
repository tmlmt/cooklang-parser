import { describe, it, expect } from "vitest";
import { normalizeKey } from "../src/utils/normalization";

describe("normalizeKey", () => {
  it.each([
    ["Huile d'olive", "huile d'olive"],
    ["huile d’olive", "huile d'olive"],
    ["càs", "cas"],
    ["Crème fraîche", "creme fraiche"],
    ["cœur", "coeur"],
    ["Straße", "strasse"],
    ["huile\u00a0 d'olive ", "huile d'olive"],
    ["ｂｕｔｔｅｒ", "butter"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeKey(input)).toBe(expected);
  });
});
