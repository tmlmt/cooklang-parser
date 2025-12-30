import { describe, it, expect } from "vitest";

import {
  normalizeUnit,
  resolveUnit,
  isNoUnit,
  NO_UNIT,
} from "../src/units/definitions";

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

describe("resolveUnit", () => {
  it("should add various properties from the corresponding canonical definition but preserve the name", () => {
    expect(resolveUnit("g").name).toBe("g");
    expect(resolveUnit("gram")).toEqual({
      name: "gram",
      type: "mass",
      system: "metric",
      aliases: ["gram", "grams", "grammes"],
      toBase: 1,
    });
  });

  it("should return type 'other' for unknown units", () => {
    expect(resolveUnit("glug").type).toBe("other");
  });
});

describe("isNoUnit", () => {
  it("should identify no-unit definitions", () => {
    expect(isNoUnit({ name: NO_UNIT, type: "other", system: "none" })).toBe(
      true,
    );
    expect(
      isNoUnit({
        name: "g",
        type: "mass",
        system: "metric",
        aliases: ["gram", "grams", "grammes"],
        toBase: 1,
      }),
    ).toBe(false);
    expect(isNoUnit(undefined)).toBe(true);
    expect(isNoUnit()).toBe(true);
  });
});
