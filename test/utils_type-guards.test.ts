import { describe, it, expect } from "vitest";

import type { AndGroup, OrGroup, QuantityWithPlainUnit } from "../src/types";
import {
  isGroup,
  isAndGroup,
  isOrGroup,
  isQuantity,
} from "../src/utils/type_guards";
import { qPlain } from "./mocks/quantity";

describe("Type Guards", () => {
  const andGroup: AndGroup = { type: "and", quantities: [] };
  const orGroup: OrGroup = { type: "or", quantities: [] };
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
});
