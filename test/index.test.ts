import { describe, it, expect } from "vitest";
import {
  Recipe,
  ShoppingList,
  CategoryConfig,
  parseFixedValue,
  parseQuantityValue,
  parseQuantityWithUnit,
  stringifyQuantityValue,
} from "../src/index";

describe("index", () => {
  it("should export Recipe", () => {
    expect(Recipe).toBeDefined();
  });

  it("should export ShoppingList", () => {
    expect(ShoppingList).toBeDefined();
  });

  it("should export CategoryConfig", () => {
    expect(CategoryConfig).toBeDefined();
  });

  it("should export quantity parse/stringify helpers", () => {
    expect(parseFixedValue).toBeTypeOf("function");
    expect(parseQuantityValue).toBeTypeOf("function");
    expect(parseQuantityWithUnit).toBeTypeOf("function");
    expect(stringifyQuantityValue).toBeTypeOf("function");
  });
});
