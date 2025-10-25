import type {
  MetadataExtract,
  Metadata,
  FixedValue,
  Range,
  TextValue,
  DecimalValue,
  FractionValue,
} from "./types";
import {
  metadataRegex,
  rangeRegex,
  numberLikeRegex,
  scalingMetaValueRegex,
} from "./regex";
import { Section as SectionObject } from "./classes/section";
import type { Ingredient, Note, Step, Cookware } from "./types";
import {
  addQuantities,
  getDefaultQuantityValue,
  CannotAddTextValueError,
  IncompatibleUnitsError,
  Quantity,
  addQuantityValues,
} from "./units";
import { ReferencedItemCannotBeRedefinedError } from "./errors";

/**
 * Pushes a pending note to the section content if it's not empty.
 * @param section - The current section object.
 * @param note - The note content.
 * @returns An empty string if the note was pushed, otherwise the original note.
 */
export function flushPendingNote(
  section: SectionObject,
  note: Note["note"],
): Note["note"] {
  if (note.length > 0) {
    section.content.push({ type: "note", note });
    return "";
  }
  return note;
}

/**
 * Pushes pending step items and a pending note to the section content.
 * @param section - The current section object.
 * @param items - The list of step items. This array will be cleared.
 * @returns true if the items were pushed, otherwise false.
 */
export function flushPendingItems(
  section: SectionObject,
  items: Step["items"],
): boolean {
  if (items.length > 0) {
    section.content.push({ type: "step", items: [...items] });
    items.length = 0;
    return true;
  }
  return false;
}

/**
 * Finds an ingredient in the list (case-insensitively) and updates it, or adds it if not present.
 * This function mutates the `ingredients` array.
 * @param ingredients - The list of ingredients.
 * @param newIngredient - The ingredient to find or add.
 * @param isReference - Whether this is a reference ingredient (`&` modifier).
 * @returns The index of the ingredient in the list.
 * @returns An object containing the index of the ingredient and its quantity part in the list.
 */
export function findAndUpsertIngredient(
  ingredients: Ingredient[],
  newIngredient: Ingredient,
  isReference: boolean,
): {
  ingredientIndex: number;
  quantityPartIndex: number | undefined;
} {
  const { name, quantity, unit } = newIngredient;

  // New ingredient
  if (isReference) {
    const indexFind = ingredients.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase(),
    );

    if (indexFind === -1) {
      throw new Error(
        `Referenced ingredient "${name}" not found. A referenced ingredient must be declared before being referenced with '&'.`,
      );
    }

    // Ingredient already exists, update it
    const existingIngredient = ingredients[indexFind]!;

    // Checking whether any provided flags are the same as the original ingredient
    for (const flag of newIngredient.flags!) {
      /* v8 ignore else -- @preserve */
      if (!existingIngredient.flags!.includes(flag)) {
        throw new ReferencedItemCannotBeRedefinedError(
          "ingredient",
          existingIngredient.name,
          flag,
        );
      }
    }

    let quantityPartIndex = undefined;
    if (quantity !== undefined) {
      const currentQuantity: Quantity = {
        value: existingIngredient.quantity ?? getDefaultQuantityValue(),
        unit: existingIngredient.unit ?? "",
      };
      const newQuantity = { value: quantity, unit: unit ?? "" };
      try {
        const total = addQuantities(currentQuantity, newQuantity);
        existingIngredient.quantity = total.value;
        existingIngredient.unit = total.unit || undefined;
        if (existingIngredient.quantityParts) {
          existingIngredient.quantityParts.push(
            ...newIngredient.quantityParts!,
          );
        } else {
          existingIngredient.quantityParts = newIngredient.quantityParts;
        }
        quantityPartIndex = existingIngredient.quantityParts!.length - 1;
      } catch (e) {
        /* v8 ignore else -- expliciting error types -- @preserve */
        if (
          e instanceof IncompatibleUnitsError ||
          e instanceof CannotAddTextValueError
        ) {
          // Addition not possible, so add as a new ingredient.
          return {
            ingredientIndex: ingredients.push(newIngredient) - 1,
            quantityPartIndex: 0,
          };
        }
      }
    }
    return {
      ingredientIndex: indexFind,
      quantityPartIndex,
    };
  }

  // Not a reference, so add as a new ingredient.
  return {
    ingredientIndex: ingredients.push(newIngredient) - 1,
    quantityPartIndex: 0,
  };
}

export function findAndUpsertCookware(
  cookware: Cookware[],
  newCookware: Cookware,
  isReference: boolean,
): {
  cookwareIndex: number;
  quantityPartIndex: number | undefined;
} {
  const { name, quantity } = newCookware;

  if (isReference) {
    const index = cookware.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase(),
    );

    if (index === -1) {
      throw new Error(
        `Referenced cookware "${name}" not found. A referenced cookware must be declared before being referenced with '&'.`,
      );
    }

    const existingCookware = cookware[index]!;

    // Checking whether any provided flags are the same as the original cookware
    for (const flag of newCookware.flags) {
      /* v8 ignore else -- @preserve */
      if (!existingCookware.flags.includes(flag)) {
        throw new ReferencedItemCannotBeRedefinedError(
          "cookware",
          existingCookware.name,
          flag,
        );
      }
    }

    let quantityPartIndex = undefined;
    if (quantity !== undefined) {
      if (!existingCookware.quantity) {
        existingCookware.quantity = quantity;
        existingCookware.quantityParts = newCookware.quantityParts;
        quantityPartIndex = 0;
      } else {
        try {
          existingCookware.quantity = addQuantityValues(
            existingCookware.quantity,
            quantity,
          );
          if (!existingCookware.quantityParts) {
            existingCookware.quantityParts = newCookware.quantityParts;
            quantityPartIndex = 0;
          } else {
            quantityPartIndex =
              existingCookware.quantityParts.push(
                ...newCookware.quantityParts!,
              ) - 1;
          }
        } catch (e) {
          /* v8 ignore else -- expliciting error type -- @preserve */
          if (e instanceof CannotAddTextValueError) {
            return {
              cookwareIndex: cookware.push(newCookware) - 1,
              quantityPartIndex: 0,
            };
          }
        }
      }
    }
    return {
      cookwareIndex: index,
      quantityPartIndex,
    };
  }

  return {
    cookwareIndex: cookware.push(newCookware) - 1,
    quantityPartIndex: quantity ? 0 : undefined,
  };
}

// Parser when we know the input is either a number-like value
export const parseFixedValue = (
  input_str: string,
): TextValue | DecimalValue | FractionValue => {
  if (!numberLikeRegex.test(input_str)) {
    return { type: "text", value: input_str };
  }

  // After this we know that s is either a fraction or a decimal value
  const s = input_str.trim().replace(",", ".");

  // fraction
  if (s.includes("/")) {
    const parts = s.split("/");

    const num = Number(parts[0]);
    const den = Number(parts[1]);

    return { type: "fraction", num, den };
  }

  // decimal
  return { type: "decimal", value: Number(s) };
};

export function parseQuantityInput(input_str: string): FixedValue | Range {
  const clean_str = String(input_str).trim();

  if (rangeRegex.test(clean_str)) {
    const range_parts = clean_str.split("-");
    // As we've tested for it, we know that we have Number-like Quantities to parse
    const min = parseFixedValue(range_parts[0]!.trim()) as
      | DecimalValue
      | FractionValue;
    const max = parseFixedValue(range_parts[1]!.trim()) as
      | DecimalValue
      | FractionValue;
    return { type: "range", min, max };
  }

  return { type: "fixed", value: parseFixedValue(clean_str) };
}

export function parseSimpleMetaVar(content: string, varName: string) {
  const varMatch = content.match(
    new RegExp(`^${varName}:\\s*(.*(?:\\r?\\n\\s+.*)*)+`, "m"),
  );
  return varMatch
    ? varMatch[1]?.trim().replace(/\s*\r?\n\s+/g, " ")
    : undefined;
}

export function parseScalingMetaVar(
  content: string,
  varName: string,
): [number, string] | undefined {
  const varMatch = content.match(scalingMetaValueRegex(varName));
  if (!varMatch) return undefined;
  if (isNaN(Number(varMatch[2]?.trim()))) {
    throw new Error("Scaling variables should be numbers");
  }
  return [Number(varMatch[2]?.trim()), varMatch[1]!.trim()];
}

export function parseListMetaVar(content: string, varName: string) {
  // Handle both inline and YAML-style tags
  const listMatch = content.match(
    new RegExp(
      `^${varName}:\\s*(?:\\[([^\\]]*)\\]|((?:\\r?\\n\\s*-\\s*.+)+))`,
      "m",
    ),
  );
  if (!listMatch) return undefined;

  /* v8 ignore else -- @preserve */
  if (listMatch[1] !== undefined) {
    // Inline list: tags: [one, two, three]
    return listMatch[1].split(",").map((tag) => tag.trim());
  } else if (listMatch[2]) {
    // YAML list:
    // tags:
    //   - one
    //   - two
    return listMatch[2]
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.replace(/^\s*-\s*/, "").trim());
  }
}

export function extractMetadata(content: string): MetadataExtract {
  const metadata: Metadata = {};
  let servings: number | undefined = undefined;

  // Is there front-matter at all?
  const metadataContent = content.match(metadataRegex)?.[1];
  if (!metadataContent) {
    return { metadata };
  }

  // String metadata variables
  for (const metaVar of [
    "title",
    "source",
    "source.name",
    "source.url",
    "author",
    "source.author",
    "prep time",
    "time.prep",
    "cook time",
    "time.cook",
    "time required",
    "time",
    "duration",
    "locale",
    "introduction",
    "description",
    "course",
    "category",
    "diet",
    "cuisine",
    "difficulty",
    "image",
    "picture",
  ] as (keyof Pick<
    Metadata,
    | "title"
    | "source"
    | "source.name"
    | "source.url"
    | "author"
    | "source.author"
    | "prep time"
    | "time.prep"
    | "cook time"
    | "time.cook"
    | "time required"
    | "time"
    | "duration"
    | "locale"
    | "introduction"
    | "description"
    | "course"
    | "category"
    | "diet"
    | "cuisine"
    | "difficulty"
    | "image"
    | "picture"
  >)[]) {
    const stringMetaValue = parseSimpleMetaVar(metadataContent, metaVar);
    if (stringMetaValue) metadata[metaVar] = stringMetaValue;
  }

  // String metadata variables
  for (const metaVar of ["serves", "yield", "servings"] as (keyof Pick<
    Metadata,
    "servings" | "yield" | "serves"
  >)[]) {
    const scalingMetaValue = parseScalingMetaVar(metadataContent, metaVar);
    if (scalingMetaValue && scalingMetaValue[1]) {
      metadata[metaVar] = scalingMetaValue[1];
      servings = scalingMetaValue[0];
    }
  }

  // List metadata variables
  for (const metaVar of ["tags", "images", "pictures"] as (keyof Pick<
    Metadata,
    "tags" | "images" | "pictures"
  >)[]) {
    const listMetaValue = parseListMetaVar(metadataContent, metaVar);
    if (listMetaValue) metadata[metaVar] = listMetaValue;
  }

  return { metadata, servings };
}
