import { describe, it, expect } from "vitest";

import type {
  AndGroup,
  FixedValue,
  OrGroup,
  QuantityWithPlainUnit,
  Range,
  IngredientQuantityGroup,
  IngredientQuantityAndGroup,
} from "../src/types";
import {
  isGroup,
  isAndGroup,
  isOrGroup,
  isQuantity,
  isSimpleGroup,
  hasAlternatives,
  isValueIntegerLike,
} from "../src/utils/type_guards";
import { qPlain } from "./mocks/quantity";

describe("Type Guards", () => {
  const andGroup: AndGroup = { and: [] };
  const orGroup: OrGroup = { or: [] };
  const quantity: QuantityWithPlainUnit = qPlain(2, "cup");

  describe("isGroup", () => {
    it("should identify Group objects", () => {
      expect(isGroup(andGroup)).toBe(true);
      expect(isGroup(orGroup)).toBe(true);
      expect(isGroup(quantity)).toBe(false);
    });
  });

  describe("isAndGroup", () => {
    it("should identify AndGroup objects", () => {
      expect(isAndGroup(andGroup)).toBe(true);
      expect(isAndGroup(orGroup)).toBe(false);
      expect(isAndGroup(quantity)).toBe(false);
    });
  });

  describe("isOrGroup", () => {
    it("should identify OrGroup objects", () => {
      expect(isOrGroup(orGroup)).toBe(true);
      expect(isOrGroup(andGroup)).toBe(false);
      expect(isOrGroup(quantity)).toBe(false);
    });
  });

  describe("isQuantity", () => {
    it("should identify QuantityWithPlainUnit objects", () => {
      expect(isQuantity(quantity)).toBe(true);
      expect(isQuantity(andGroup)).toBe(false);
      expect(isQuantity(orGroup)).toBe(false);
    });
  });

  describe("isValueIntegerLike", () => {
    it("should identify integer-like fixed decimal values", () => {
      const fixedInt: FixedValue = {
        type: "fixed",
        value: { type: "decimal", decimal: 4 },
      };
      const fixedNonInt: FixedValue = {
        type: "fixed",
        value: { type: "decimal", decimal: 4.5 },
      };
      expect(isValueIntegerLike(fixedInt)).toBe(true);
      expect(isValueIntegerLike(fixedNonInt)).toBe(false);
    });
    it("should identify integer-like fixed fraction values", () => {
      const fixedInt: FixedValue = {
        type: "fixed",
        value: { type: "fraction", num: 6, den: 3 },
      };
      const fixedNonInt: FixedValue = {
        type: "fixed",
        value: { type: "fraction", num: 7, den: 3 },
      };
      expect(isValueIntegerLike(fixedInt)).toBe(true);
      expect(isValueIntegerLike(fixedNonInt)).toBe(false);
    });
    it("should identify integer-like range values", () => {
      const rangeInt: Range = {
        type: "range",
        min: { type: "decimal", decimal: 2 },
        max: { type: "decimal", decimal: 6 },
      };
      const rangeNonInt: Range = {
        type: "range",
        min: { type: "decimal", decimal: 2.5 },
        max: { type: "decimal", decimal: 6 },
      };
      expect(isValueIntegerLike(rangeInt)).toBe(true);
      expect(isValueIntegerLike(rangeNonInt)).toBe(false);
    });
    it("should return false for text values", () => {
      const fixedText: FixedValue = {
        type: "fixed",
        value: {
          type: "text",
          text: "example",
        },
      };
      expect(isValueIntegerLike(fixedText)).toBe(false);
    });
  });

  describe("isSimpleGroup", () => {
    it("should return true for simple groups with quantity", () => {
      const simpleGroup: IngredientQuantityGroup = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: "g",
      };
      expect(isSimpleGroup(simpleGroup)).toBe(true);
    });

    it("should return false for AND groups", () => {
      const andGroup: IngredientQuantityAndGroup = {
        and: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "cup",
          },
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
            unit: "tbsp",
          },
        ],
      };
      expect(isSimpleGroup(andGroup)).toBe(false);
    });
  });

  describe("hasAlternatives", () => {
    it("should return true for entries with alternatives", () => {
      const entryWithAlternatives: IngredientQuantityGroup = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: "g",
        alternatives: [{ index: 1 }],
      };
      expect(hasAlternatives(entryWithAlternatives)).toBe(true);
    });

    it("should return false for entries without alternatives", () => {
      const entryWithoutAlternatives: IngredientQuantityGroup = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: "g",
      };
      expect(hasAlternatives(entryWithoutAlternatives)).toBe(false);
    });

    it("should return false for entries with empty alternatives array", () => {
      const entryWithEmptyAlternatives: IngredientQuantityGroup = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: "g",
        alternatives: [],
      };
      expect(hasAlternatives(entryWithEmptyAlternatives)).toBe(false);
    });

    it("should work with AND groups that have alternatives", () => {
      const andGroupWithAlts: IngredientQuantityAndGroup = {
        and: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "cup",
          },
        ],
        alternatives: [{ index: 2 }],
      };
      expect(hasAlternatives(andGroupWithAlts)).toBe(true);
    });
  });
});
