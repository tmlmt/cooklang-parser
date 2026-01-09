import { describe, it, expect } from "vitest";

import type {
  AndGroup,
  FixedValue,
  OrGroup,
  QuantityWithPlainUnit,
  Range,
} from "../src/types";
import {
  isGroup,
  isAndGroup,
  isOrGroup,
  isQuantity,
} from "../src/utils/type_guards";
import { qPlain } from "./mocks/quantity";
import { isValueIntegerLike } from "../src/utils/type_guards";

describe("Type Guards", () => {
  const andGroup: AndGroup = { type: "and", entries: [] };
  const orGroup: OrGroup = { type: "or", entries: [] };
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
});
