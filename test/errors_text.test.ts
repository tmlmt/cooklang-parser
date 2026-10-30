import { describe, it, expect } from "vitest";
import { ReferencedCookwarePropsDoNotMatchError } from "../src/errors";

describe("errors", () => {
  describe("ReferencedCookwarePropsDoNotMatchError", () => {
    it("should contains expected text", () => {
      const error = new ReferencedCookwarePropsDoNotMatchError("pan");
      expect(error.message).toBe(
        'Referenced cookware "pan" does not match the flags of the initial cookware declaration.',
      );
      expect(error.code).toBe("COOKLANG_E0203");
      expect(error.diagnostic.fix).toBeDefined();
    });
  });
});
