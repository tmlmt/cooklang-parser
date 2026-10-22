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
        'Referenced ingredient "flour" cannot be redefined as "hidden".',
      );
      expect(error.code).toBe("COOKLANG_E0203");
      expect(error.diagnostic.fix).toBeDefined();
    });
  });
});
