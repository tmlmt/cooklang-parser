import { describe, it, expect } from "vitest";
import { ReferencedItemCannotBeRedefinedError } from "../src/errors";

describe("errors", () => {
  describe("ReferencedItemCannotBeRedefinedError", () => {
    it("should contains expected text", () => {
      const error = new ReferencedItemCannotBeRedefinedError(
        "ingredient",
        "flour",
        "hidden",
      );
      expect(error.message).toBe(
        'The referenced ingredient "flour" cannot be redefined as hidden.\nYou can either remove the reference to create a new ingredient defined as hidden or add the hidden flag to the original definition of the ingredient',
      );
    });
  });
});
