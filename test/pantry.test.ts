import { describe, it, expect } from "vitest";
import { Pantry } from "../src/classes/pantry";
import { CategoryConfig } from "../src/classes/category_config";
import type { PantryItem, FixedValue } from "../src/types";

const simplePantryToml = `
[freezer]
cranberries = "500%g"
spinach = { bought = "05.05.2024", expire = "05.06.2025", quantity = "1%kg" }

[fridge]
milk = { expire = "10.05.2024", quantity = "1%L" }
cheese = { expire = "15.05.2024" }

[pantry]
rice = "5%kg"
pasta = { quantity = "1%kg", low = "200%g" }
flour = { quantity = "0%g" }
`;

const lowStockPantryToml = `
[pantry]
rice = { quantity = "100%g", low = "200%g" }
pasta = { quantity = "1%kg", low = "200%g" }
flour = { quantity = "0%g" }
sugar = { quantity = "500%g" }
`;

describe("Pantry", () => {
  describe("Parsing", () => {
    it("should parse a simple pantry TOML", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.items).toHaveLength(7);
    });

    it("should parse item locations correctly", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.items[0]).toMatchObject<Partial<PantryItem>>({
        name: "cranberries",
        location: "freezer",
      });
      expect(pantry.items[2]).toMatchObject<Partial<PantryItem>>({
        name: "milk",
        location: "fridge",
      });
      expect(pantry.items[4]).toMatchObject<Partial<PantryItem>>({
        name: "rice",
        location: "pantry",
      });
    });

    it("should parse simple string quantities", () => {
      const pantry = new Pantry(simplePantryToml);
      const cranberries = pantry.items.find((i) => i.name === "cranberries")!;
      expect(cranberries.quantity).toMatchObject<FixedValue>({
        type: "fixed",
        value: { type: "decimal", decimal: 500 },
      });
      expect(cranberries.unit).toBe("g");
    });

    it("should parse object entries with quantity and dates", () => {
      const pantry = new Pantry(simplePantryToml);
      const spinach = pantry.items.find((i) => i.name === "spinach")!;
      expect(spinach.quantity).toMatchObject<FixedValue>({
        type: "fixed",
        value: { type: "decimal", decimal: 1 },
      });
      expect(spinach.unit).toBe("kg");
      expect(spinach.bought).toEqual(new Date(2024, 4, 5));
      expect(spinach.expire).toEqual(new Date(2025, 5, 5));
    });

    it("should parse object entries with low threshold", () => {
      const pantry = new Pantry(simplePantryToml);
      const pasta = pantry.items.find((i) => i.name === "pasta")!;
      expect(pasta.low).toMatchObject<FixedValue>({
        type: "fixed",
        value: { type: "decimal", decimal: 200 },
      });
      expect(pasta.lowUnit).toBe("g");
    });

    it("should parse object entries with only expire date", () => {
      const pantry = new Pantry(simplePantryToml);
      const cheese = pantry.items.find((i) => i.name === "cheese")!;
      expect(cheese.expire).toEqual(new Date(2024, 4, 15));
      expect(cheese.quantity).toBeUndefined();
    });

    it("should handle quantities without units", () => {
      const pantry = new Pantry(`[pantry]\neggs = "6"`);
      const eggs = pantry.items.find((i) => i.name === "eggs")!;
      expect(eggs.quantity).toMatchObject<FixedValue>({
        type: "fixed",
        value: { type: "decimal", decimal: 6 },
      });
      expect(eggs.unit).toBeUndefined();
    });

    it("should parse via constructor", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.items.length).toBeGreaterThan(0);
    });

    it("should allow creating empty pantry", () => {
      const pantry = new Pantry();
      expect(pantry.items).toEqual([]);
    });

    it("should reset items on re-parse", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.items).toHaveLength(7);
      pantry.parse(`[pantry]\nrice = "1%kg"`);
      expect(pantry.items).toHaveLength(1);
    });
  });

  describe("Date parsing", () => {
    it("should parse DD.MM.YYYY (default fuzzy)", () => {
      const pantry = new Pantry(`[fridge]\nmilk = { expire = "15.06.2025" }`);
      expect(pantry.items[0]!.expire).toEqual(new Date(2025, 5, 15));
    });

    it("should parse DD/MM/YYYY (default fuzzy)", () => {
      const pantry = new Pantry(`[fridge]\nmilk = { expire = "15/06/2025" }`);
      expect(pantry.items[0]!.expire).toEqual(new Date(2025, 5, 15));
    });

    it("should parse YYYY-MM-DD (default fuzzy)", () => {
      const pantry = new Pantry(`[fridge]\nmilk = { expire = "2025-06-15" }`);
      expect(pantry.items[0]!.expire).toEqual(new Date(2025, 5, 15));
    });

    it("should parse DD-MM-YYYY (default fuzzy)", () => {
      const pantry = new Pantry(`[fridge]\nmilk = { expire = "15-06-2025" }`);
      expect(pantry.items[0]!.expire).toEqual(new Date(2025, 5, 15));
    });

    it("should parse 2-digit year as 20xx (default fuzzy)", () => {
      const pantry = new Pantry(`[fridge]\nmilk = { expire = "15.06.25" }`);
      expect(pantry.items[0]!.expire).toEqual(new Date(2025, 5, 15));
    });

    it("should use explicit date format MM/DD/YYYY", () => {
      const pantry = new Pantry(`[fridge]\nmilk = { expire = "06/15/2025" }`, {
        dateFormat: "MM/DD/YYYY",
      });
      expect(pantry.items[0]!.expire).toEqual(new Date(2025, 5, 15));
    });

    it("should use explicit date format YYYY-MM-DD", () => {
      const pantry = new Pantry(`[fridge]\nmilk = { expire = "2025-06-15" }`, {
        dateFormat: "YYYY-MM-DD",
      });
      expect(pantry.items[0]!.expire).toEqual(new Date(2025, 5, 15));
    });

    it("should throw on invalid date input with explicit format", () => {
      expect(
        () =>
          new Pantry(`[fridge]\nmilk = { expire = "2025-13-01" }`, {
            dateFormat: "YYYY-MM-DD",
          }),
      ).toThrow(/Invalid date/);
    });

    it("should throw on non-numeric date parts", () => {
      expect(
        () => new Pantry(`[fridge]\nmilk = { expire = "abc.06.2025" }`),
      ).toThrow(/non-numeric/);
    });
  });

  describe("getDepletedItems", () => {
    it("should return items with zero quantity", () => {
      const pantry = new Pantry(lowStockPantryToml);
      const depleted = pantry.getDepletedItems();
      const names = depleted.map((i) => i.name);
      expect(names).toContain("flour");
    });

    it("should return items below low threshold", () => {
      const pantry = new Pantry(lowStockPantryToml);
      const depleted = pantry.getDepletedItems();
      const names = depleted.map((i) => i.name);
      expect(names).toContain("rice");
    });

    it("should not return items above low threshold", () => {
      const pantry = new Pantry(lowStockPantryToml);
      const depleted = pantry.getDepletedItems();
      const names = depleted.map((i) => i.name);
      expect(names).not.toContain("pasta");
      expect(names).not.toContain("sugar");
    });
  });

  describe("getExpiredItems", () => {
    it("should return items already past expiry date", () => {
      const pantry = new Pantry(simplePantryToml);
      // All expire dates in simplePantryToml are in 2024/2025, which are past "today" (Feb 2026)
      const expired = pantry.getExpiredItems();
      const names = expired.map((i) => i.name);
      expect(names).toContain("milk");
      expect(names).toContain("cheese");
      expect(names).toContain("spinach");
    });

    it("should not return items without an expire date", () => {
      const pantry = new Pantry(simplePantryToml);
      const expired = pantry.getExpiredItems();
      const names = expired.map((i) => i.name);
      expect(names).not.toContain("cranberries");
      expect(names).not.toContain("rice");
    });

    it("should return items expiring within nbDays", () => {
      // Use a date far in the future so it's not expired at nbDays=0
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const dd = String(futureDate.getDate()).padStart(2, "0");
      const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
      const yyyy = futureDate.getFullYear();
      const pantry = new Pantry(
        `[fridge]\nmilk = { expire = "${dd}.${mm}.${yyyy}" }`,
      );

      expect(pantry.getExpiredItems(0)).toHaveLength(0);
      expect(pantry.getExpiredItems(5)).toHaveLength(1);
      expect(pantry.getExpiredItems(10)).toHaveLength(1);
    });
  });

  describe("isLow", () => {
    it("should return true for items at zero quantity", () => {
      const pantry = new Pantry(lowStockPantryToml);
      expect(pantry.isLow("flour")).toBe(true);
    });

    it("should return true for items below low threshold", () => {
      const pantry = new Pantry(lowStockPantryToml);
      expect(pantry.isLow("rice")).toBe(true);
    });

    it("should return false for items above low threshold", () => {
      const pantry = new Pantry(lowStockPantryToml);
      expect(pantry.isLow("pasta")).toBe(false);
    });

    it("should return false for items without low threshold", () => {
      const pantry = new Pantry(lowStockPantryToml);
      expect(pantry.isLow("sugar")).toBe(false);
    });

    it("should return false for unknown items", () => {
      const pantry = new Pantry(lowStockPantryToml);
      expect(pantry.isLow("nonexistent")).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("should return true for items past expiry", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.isExpired("milk")).toBe(true);
    });

    it("should return false for items without expiry", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.isExpired("cranberries")).toBe(false);
    });

    it("should return false for unknown items", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.isExpired("nonexistent")).toBe(false);
    });
  });

  describe("findItem with CategoryConfig aliases", () => {
    it("should find item by exact name", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.findItem("rice")).toBeDefined();
      expect(pantry.findItem("rice")!.name).toBe("rice");
    });

    it("should find item by exact name case-insensitively", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.findItem("Rice")).toBeDefined();
      expect(pantry.findItem("Rice")!.name).toBe("rice");
    });

    it("should return undefined for unknown item without config", () => {
      const pantry = new Pantry(simplePantryToml);
      expect(pantry.findItem("riz")).toBeUndefined();
    });

    it("should find item by alias when CategoryConfig is set", () => {
      const pantry = new Pantry(simplePantryToml);
      const config = new CategoryConfig(`[Grains]\nrice|riz|arroz`);
      pantry.setCategoryConfig(config);

      expect(pantry.findItem("riz")).toBeDefined();
      expect(pantry.findItem("riz")!.name).toBe("rice");
      expect(pantry.findItem("arroz")).toBeDefined();
      expect(pantry.findItem("arroz")!.name).toBe("rice");
    });

    it("should find item by alias case-insensitively", () => {
      const pantry = new Pantry(simplePantryToml);
      const config = new CategoryConfig(`[Grains]\nrice|riz`);
      pantry.setCategoryConfig(config);

      expect(pantry.findItem("RIZ")).toBeDefined();
      expect(pantry.findItem("RIZ")!.name).toBe("rice");
    });

    it("should use alias lookup for isLow", () => {
      const pantry = new Pantry(lowStockPantryToml);
      const config = new CategoryConfig(`[Grains]\nrice|riz`);
      pantry.setCategoryConfig(config);

      expect(pantry.isLow("riz")).toBe(true);
    });

    it("should use alias lookup for isExpired", () => {
      const pantry = new Pantry(simplePantryToml);
      const config = new CategoryConfig(`[Dairy]\nmilk|lait`);
      pantry.setCategoryConfig(config);

      expect(pantry.isExpired("lait")).toBe(true);
    });

    it("should return undefined when alias matches but no pantry item uses any of the aliases", () => {
      const pantry = new Pantry(`[pantry]\nsugar = "500%g"`);
      const config = new CategoryConfig(`[Grains]\nrice|riz`);
      pantry.setCategoryConfig(config);

      // "riz" is an alias for "rice" but neither "rice" nor "riz" is in pantry
      expect(pantry.findItem("riz")).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle text quantities (not numeric)", () => {
      const pantry = new Pantry(`[pantry]\nsalt = "a pinch"`);
      const salt = pantry.items.find((i) => i.name === "salt")!;
      expect(salt.quantity).toBeDefined();
      // Text quantities should not be considered low
      expect(pantry.isLow("salt")).toBe(false);
    });

    it("should handle range quantities", () => {
      const pantry = new Pantry(
        `[pantry]\nrice = { quantity = "1-2%kg", low = "500%g" }`,
      );
      const rice = pantry.items.find((i) => i.name === "rice")!;
      expect(rice.quantity).toBeDefined();
      expect(rice.quantity!.type).toBe("range");
      // range average is 1.5kg = 1500g, low is 500g → not low
      expect(pantry.isLow("rice")).toBe(false);
    });

    it("should detect low with unit conversion (kg vs g threshold)", () => {
      const pantry = new Pantry(
        `[pantry]\nrice = { quantity = "100%g", low = "1%kg" }`,
      );
      // 100g < 1kg (= 1000g) → should be low
      expect(pantry.isLow("rice")).toBe(true);
    });

    it("should not consider items without quantity as low", () => {
      const pantry = new Pantry(`[pantry]\ncheese = { expire = "01.01.2030" }`);
      expect(pantry.isLow("cheese")).toBe(false);
    });

    it("should handle items with quantity but no low threshold as not low", () => {
      const pantry = new Pantry(`[pantry]\nsugar = "500%g"`);
      expect(pantry.isLow("sugar")).toBe(false);
    });

    it("should handle low threshold without unit (unitless comparison)", () => {
      const pantry = new Pantry(
        `[pantry]\neggs = { quantity = "2", low = "6" }`,
      );
      // 2 < 6 → should be low
      expect(pantry.isLow("eggs")).toBe(true);
    });

    it("should handle low threshold with unknown unit (no base conversion)", () => {
      const pantry = new Pantry(
        `[pantry]\nwidgets = { quantity = "2%widget", low = "5%widget" }`,
      );
      // 2 < 5 → low, "widget" is unknown so no conversion is applied
      expect(pantry.isLow("widgets")).toBe(true);
    });

    it("should handle low threshold with low quantity having no unit", () => {
      const pantry = new Pantry(
        `[pantry]\nstuff = { quantity = "0", low = "5" }`,
      );
      expect(pantry.isLow("stuff")).toBe(true);
    });
  });
});
