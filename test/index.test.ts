import { describe, it, expect } from "vitest";
import { Recipe, ShoppingList, AisleConfig } from "../src/index";

describe("index", () => {
  it("should export Recipe", () => {
    expect(Recipe).toBeDefined();
  });

  it("should export ShoppingList", () => {
    expect(ShoppingList).toBeDefined();
  });

  it("should export AisleConfig", () => {
    expect(AisleConfig).toBeDefined();
  });
});
