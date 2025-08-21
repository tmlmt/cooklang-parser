import { describe, it, expect } from "vitest";
import { addQuantities, normalizeUnit } from "../src/units";

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

describe("addQuantities", () => {
  it("should add same units correctly", () => {
    expect(
      addQuantities({ value: 100, unit: "g" }, { value: 200, unit: "g" }),
    ).toEqual({ value: 300, unit: "g" });
  });

  it("should add compatible metric units and convert to largest", () => {
    expect(
      addQuantities({ value: 1, unit: "kg" }, { value: 500, unit: "g" }),
    ).toEqual({ value: 1.5, unit: "kg" });
    expect(
      addQuantities({ value: 500, unit: "g" }, { value: 1, unit: "kg" }),
    ).toEqual({ value: 1.5, unit: "kg" });
  });

  it("should add compatible imperial units and convert to largest", () => {
    expect(
      addQuantities({ value: 1, unit: "lb" }, { value: 8, unit: "oz" }),
    ).toEqual({ value: 1.5, unit: "lb" });
  });

  it("should add compatible metric and imperial units, converting to largest metric", () => {
    const result = addQuantities(
      { value: 1, unit: "lb" },
      { value: 500, unit: "g" },
    );
    expect(result.unit).toBe("kg");
    expect(result.value).toBe(0.95);
  });

  it("should round result to 2 decimal places", () => {
    expect(
      addQuantities({ value: 1.234, unit: "g" }, { value: 2.345, unit: "g" }),
    ).toEqual({ value: 3.58, unit: "g" });
  });

  it("should throw an error for incompatible types", () => {
    expect(() =>
      addQuantities({ value: 1, unit: "kg" }, { value: 1, unit: "l" }),
    ).toThrow(/Cannot add quantities of different types/);
  });

  it("should add unknown but identical units", () => {
    expect(
      addQuantities({ value: 2, unit: "cloves" }, { value: 3, unit: "cloves" }),
    ).toEqual({ value: 5, unit: "cloves" });
  });

  it("should throw for unknown and different units", () => {
    expect(() =>
      addQuantities({ value: 1, unit: "clove" }, { value: 1, unit: "head" }),
    ).toThrow(/incompatible or unknown units/);
  });

  it("should throw for text quantities", () => {
    expect(() =>
      addQuantities({ value: "to taste", unit: "" }, { value: 100, unit: "g" }),
    ).toThrow("Cannot add quantity to string-quantified value: to taste");
    expect(() =>
      addQuantities(
        { value: "10", unit: "tsp" },
        { value: "some", unit: "tsp" },
      ),
    ).toThrow("Cannot add quantity to string-quantified value: some");
  });

  it("should handle adding to a quantity with no unit", () => {
    expect(
      addQuantities({ value: 1, unit: "" }, { value: 2, unit: "pieces" }),
    ).toEqual({ value: 3, unit: "pieces" });
    expect(
      addQuantities({ value: 100, unit: "g" }, { value: 1, unit: "" }),
    ).toEqual({ value: 101, unit: "g" });
  });
});
