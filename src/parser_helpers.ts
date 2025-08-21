import type { MetadataExtract, Metadata } from "./types";
import { metadataRegex } from "./regex";
import { Section as SectionObject } from "./classes/section";
import type { Ingredient, Note, Step, Cookware } from "./types";
import { addQuantities } from "./units";

/**
 * Finds an item in a list or adds it if not present, then returns its index.
 * @param list The list to search in.
 * @param finder A predicate to find the item.
 * @param creator A function to create the item if not found.
 * @returns The index of the item in the list.
 */
export function findOrPush<T>(
  list: T[],
  finder: (elem: T) => boolean,
  creator: () => T,
): number {
  let index = list.findIndex(finder);
  if (index === -1) {
    index = list.push(creator()) - 1;
  }
  return index;
}

/**
 * Pushes a pending note to the section content if it's not empty.
 * @param section The current section object.
 * @param note The note content.
 * @returns An empty string if the note was pushed, otherwise the original note.
 */
export function flushPendingNote(
  section: SectionObject,
  note: Note["note"],
): Note["note"] {
  if (note.length > 0) {
    section.content.push({ note });
    return "";
  }
  return note;
}

/**
 * Pushes pending step items and a pending note to the section content.
 * @param section The current section object.
 * @param items The list of step items. This array will be cleared.
 * @returns true if the items were pushed, otherwise false.
 */
export function flushPendingItems(
  section: SectionObject,
  items: Step["items"],
): boolean {
  if (items.length > 0) {
    section.content.push({ items: [...items] });
    items.length = 0;
    return true;
  }
  return false;
}

/**
 * Finds an ingredient in the list (case-insensitively) and updates it, or adds it if not present.
 * This function mutates the `ingredients` array.
 * @param ingredients The list of ingredients.
 * @param newIngredient The ingredient to find or add.
 * @param isReference Whether this is a reference ingredient (`&` modifier).
 * @returns The index of the ingredient in the list.
 */
export function findAndUpsertIngredient(
  ingredients: Ingredient[],
  newIngredient: Ingredient,
  isReference: boolean,
): number {
  const { name, quantity, unit } = newIngredient;

  // New ingredient
  if (isReference) {
    const index = ingredients.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase(),
    );

    if (index === -1) {
      throw new Error(
        `Referenced ingredient "${name}" not found. A referenced ingredient must be declared before being referenced with '&'.`,
      );
    }

    // Ingredient already exists, update it
    const existingIngredient = ingredients[index]!;
    if (quantity !== undefined) {
      const currentQuantity = {
        value: existingIngredient.quantity ?? 0,
        unit: existingIngredient.unit ?? "",
      };
      const newQuantity = { value: quantity, unit: unit ?? "" };

      const total = addQuantities(currentQuantity, newQuantity);
      existingIngredient.quantity = total.value;
      existingIngredient.unit = total.unit || undefined;
    }
    return index;
  }

  // Not a reference, so add as a new ingredient.
  return ingredients.push(newIngredient) - 1;
}

export function findAndUpsertCookware(
  cookware: Cookware[],
  newCookware: Cookware,
  isReference: boolean,
): number {
  const { name } = newCookware;

  if (isReference) {
    const index = cookware.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase(),
    );

    if (index === -1) {
      throw new Error(
        `Referenced cookware "${name}" not found. A referenced cookware must be declared before being referenced with '&'.`,
      );
    }

    return index;
  }

  return cookware.push(newCookware) - 1;
}

export function parseNumber(input_str: string): number {
  const clean_str = String(input_str).replace(",", ".");
  if (!clean_str.startsWith("/") && clean_str.includes("/")) {
    const [num, den] = clean_str.split("/").map(Number);
    return num! / den!;
  }
  return Number(clean_str);
}

export function parseSimpleMetaVar(content: string, varName: string) {
  const varMatch = content.match(
    new RegExp(`^${varName}:\\s*(.*(?:\\r?\\n\\s+.*)*)+`, "m"),
  );
  return varMatch
    ? varMatch[1]?.trim().replace(/\s*\r?\n\s+/g, " ")
    : undefined;
}

export function parseScalingMetaVar(content: string, varName: string) {
  const varMatch = content.match(
    new RegExp(`^${varName}:[\\t ]*(([^,\\n]*),? ?(?:.*)?)`, "m"),
  );
  if (!varMatch) return undefined;
  if (isNaN(Number(varMatch[2]?.trim()))) {
    throw new Error("Scaling variables should be numbers");
  }
  return [Number(varMatch[2]?.trim()), varMatch[1]?.trim()];
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
  ] as (keyof Metadata)[]) {
    const stringMetaValue: any = parseSimpleMetaVar(metadataContent, metaVar);
    if (stringMetaValue) metadata[metaVar] = stringMetaValue;
  }

  // String metadata variables
  for (const metaVar of ["servings", "yield", "serves"] as (keyof Metadata)[]) {
    const scalingMetaValue: any = parseScalingMetaVar(metadataContent, metaVar);
    if (scalingMetaValue && scalingMetaValue[1]) {
      metadata[metaVar] = scalingMetaValue[1];
      servings = scalingMetaValue[0];
    }
  }

  // List metadata variables
  for (const metaVar of ["tags", "images", "pictures"] as (keyof Metadata)[]) {
    const listMetaValue: any = parseListMetaVar(metadataContent, metaVar);
    if (listMetaValue) metadata[metaVar] = listMetaValue;
  }

  return { metadata, servings };
}
