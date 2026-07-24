import { describe, it, expect } from "vitest";
import { CategoryConfig } from "../src/classes/category_config";
import {
  DuplicateCategoryError,
  DuplicateIngredientAliasError,
  IngredientWithoutCategoryError,
} from "../src/errors";

describe("parse_category_config", () => {
  it("parses a simple config", () => {
    const config = `
            [produce]
            potatoes
            onions

            [dairy]
            milk
            butter
        `;
    const result = new CategoryConfig(config);
    expect(result).toEqual({
      categories: [
        {
          name: "produce",
          ingredients: [
            { name: "potatoes", aliases: ["potatoes"] },
            { name: "onions", aliases: ["onions"] },
          ],
        },
        {
          name: "dairy",
          ingredients: [
            { name: "milk", aliases: ["milk"] },
            { name: "butter", aliases: ["butter"] },
          ],
        },
      ],
    });
  });

  it("parses a config with synonyms", () => {
    const config = `
            [canned goods]
            tuna|chicken of the sea
            beans
        `;
    const result = new CategoryConfig(config);
    expect(result).toEqual({
      categories: [
        {
          name: "canned goods",
          ingredients: [
            { name: "tuna", aliases: ["tuna", "chicken of the sea"] },
            { name: "beans", aliases: ["beans"] },
          ],
        },
      ],
    });
  });

  it("handles an empty config", () => {
    const config = "";
    const result = new CategoryConfig(config);
    expect(result).toEqual({ categories: [] });
  });

  it("handles a config with extra whitespace and empty lines", () => {
    const config = `

            [ produce ]

            potatoes |  onions


            [dairy]
            milk

        `;
    const result = new CategoryConfig(config);
    expect(result).toEqual({
      categories: [
        {
          name: "produce",
          ingredients: [{ name: "potatoes", aliases: ["potatoes", "onions"] }],
        },
        {
          name: "dairy",
          ingredients: [{ name: "milk", aliases: ["milk"] }],
        },
      ],
    });
  });

  it("handles categories with no ingredients", () => {
    const config = `
            [produce]
            [dairy]
            milk
        `;
    const result = new CategoryConfig(config);
    expect(result).toEqual({
      categories: [
        {
          name: "produce",
          ingredients: [],
        },
        {
          name: "dairy",
          ingredients: [{ name: "milk", aliases: ["milk"] }],
        },
      ],
    });
  });

  it("throws a DuplicateCategoryError for duplicate categories", () => {
    const config = `
            [produce]
            [produce]
        `;
    expect(() => new CategoryConfig(config)).toThrow(DuplicateCategoryError);
  });

  it("throws a DuplicateIngredientAliasError for duplicate ingredients", () => {
    const config = `
            [produce]
            potatoes
            [dairy]
            potatoes
        `;
    expect(() => new CategoryConfig(config)).toThrow(DuplicateIngredientAliasError);
  });

  it("throws a DuplicateIngredientAliasError for duplicate aliases", () => {
    const config = `
            [produce]
            potato|spud
            [dairy]
            spud
        `;
    expect(() => new CategoryConfig(config)).toThrow(DuplicateIngredientAliasError);
  });

  it("throws an IngredientWithoutCategoryError for ingredients without a category", () => {
    const config = `
            potatoes
            [produce]
        `;
    expect(() => new CategoryConfig(config)).toThrow(IngredientWithoutCategoryError);
  });
});
