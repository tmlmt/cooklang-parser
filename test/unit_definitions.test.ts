import { describe, it, expect } from "vitest";

import {
  normalizeUnit,
  getNormalizedUnit,
} from "../src/models/unit_definitions";

describe("normalizeUnit", () => {
  it("should normalize various unit strings to a canonical definition", () => {
    expect(normalizeUnit("g")?.name).toBe("g");
    expect(normalizeUnit("gram")?.name).toBe("g");
    expect(normalizeUnit("grams")?.name).toBe("g");
    expect(normalizeUnit("kilogram")?.name).toBe("kg");
    expect(normalizeUnit("L")?.name).toBe("l");
    expect(normalizeUnit("pounds")?.name).toBe("lb");
  });

  it("should return undefined for unknown units", () => {
    expect(normalizeUnit("glug")).toBeUndefined();
  });
});

describe("getNormalizedUnit", () => {
  it("should add various properties from the corresponding canonical definition but preserve the name", () => {
    expect(getNormalizedUnit("g").name).toBe("g");
    expect(getNormalizedUnit("gram")).toEqual({
      name: "gram",
      type: "mass",
      system: "metric",
      aliases: ["gram", "grams", "grammes"],
      toBase: 1,
    });
  });

  it("should return type 'other' for unknown units", () => {
    expect(getNormalizedUnit("glug").type).toBe("other");
  });
});
