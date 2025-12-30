import { describe, it, expect } from "vitest";

import { deepClone } from "../src/utils/general";

describe("deepClone", () => {
  it("should create a deep clone of a simple object", () => {
    const original = { a: 1, b: 2 };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it("should create a deep clone of a nested object", () => {
    const original = { a: 1, b: { c: 2, d: 3 } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned.b).not.toBe(original.b);
  });

  it("should create a deep clone of an array", () => {
    const original = [1, 2, { a: 3 }];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned[2]).not.toBe(original[2]);
  });

  it("should handle null and undefined values", () => {
    expect(deepClone(null)).toBeNull();
    expect(deepClone(undefined)).toBeUndefined();
  });

  it("should handle objects", () => {
    const original = { date: new Date() };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).toBeTypeOf("object");
    expect(cloned.date).not.toBe(original.date);
  });
});
