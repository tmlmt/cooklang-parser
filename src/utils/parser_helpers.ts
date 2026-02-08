import type {
  MetadataExtract,
  Metadata,
  MetadataSource,
  MetadataTime,
  MetadataValue,
  MetadataObject,
  FixedValue,
  Range,
  TextValue,
  DecimalValue,
  FractionValue,
  NoteItem,
  SpecificUnitSystem,
} from "../types";
import {
  metadataRegex,
  metadataKeyRegex,
  nestedMetaVarRegex,
  numericValueRegex,
  rangeRegex,
  numberLikeRegex,
  scalingMetaValueRegex,
} from "../regex";
import { Section as SectionObject } from "../classes/section";
import type { Ingredient, Step, Cookware } from "../types";
import { addQuantityValues } from "../quantities/mutations";
import {
  CannotAddTextValueError,
  NoTabAsIndentError,
  BadIndentationError,
  ReferencedItemCannotBeRedefinedError,
} from "../errors";

/**
 * Pushes a pending note to the section content if it has items.
 * @param section - The current section object.
 * @param noteItems - The note items array.
 * @returns An empty array if the note was pushed, otherwise the original items.
 */
export function flushPendingNote(
  section: SectionObject,
  noteItems: NoteItem[],
): NoteItem[] {
  if (noteItems.length > 0) {
    section.content.push({ type: "note", items: [...noteItems] });
    return [];
  }
  return noteItems;
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
): number {
  const { name } = newIngredient;

  if (isReference) {
    const indexFind = ingredients.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase(),
    );

    if (indexFind === -1) {
      throw new Error(
        `Referenced ingredient "${name}" not found. A referenced ingredient must be declared before being referenced with '&'.`,
      );
    }

    // Ingredient already exists
    const existingIngredient = ingredients[indexFind]!;

    // Checking whether any provided flags are the same as the original ingredient
    // TODO: backport fix (check on array length) to v2
    if (!newIngredient.flags) {
      if (
        Array.isArray(existingIngredient.flags) &&
        existingIngredient.flags.length > 0
      ) {
        throw new ReferencedItemCannotBeRedefinedError(
          "ingredient",
          existingIngredient.name,
          existingIngredient.flags[0]!,
        );
      }
    } else {
      for (const flag of newIngredient.flags) {
        /* v8 ignore else -- @preserve */
        if (
          existingIngredient.flags === undefined ||
          !existingIngredient.flags.includes(flag)
        ) {
          throw new ReferencedItemCannotBeRedefinedError(
            "ingredient",
            existingIngredient.name,
            flag,
          );
        }
      }
    }

    return indexFind;
  }

  // Not a reference, so add as a new ingredient.
  return ingredients.push(newIngredient) - 1;
}

export function findAndUpsertCookware(
  cookware: Cookware[],
  newCookware: Cookware,
  isReference: boolean,
): number {
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
    // TODO: backport fix (if/else) + check on array length to v2
    if (!newCookware.flags) {
      if (
        Array.isArray(existingCookware.flags) &&
        existingCookware.flags.length > 0
      ) {
        throw new ReferencedItemCannotBeRedefinedError(
          "cookware",
          existingCookware.name,
          existingCookware.flags[0]!,
        );
      }
    } else {
      for (const flag of newCookware.flags) {
        /* v8 ignore else -- @preserve */
        if (
          existingCookware.flags === undefined ||
          !existingCookware.flags.includes(flag)
        ) {
          throw new ReferencedItemCannotBeRedefinedError(
            "cookware",
            existingCookware.name,
            flag,
          );
        }
      }
    }

    if (quantity !== undefined) {
      if (!existingCookware.quantity) {
        existingCookware.quantity = quantity;
      } else {
        try {
          existingCookware.quantity = addQuantityValues(
            existingCookware.quantity,
            quantity,
          );
        } catch (e) {
          /* v8 ignore else -- expliciting error type -- @preserve */
          if (e instanceof CannotAddTextValueError) {
            return cookware.push(newCookware) - 1;
          }
        }
      }
    }
    return index;
  }

  return cookware.push(newCookware) - 1;
}

// Parser when we know the input is either a number-like value
export const parseFixedValue = (
  input_str: string,
): TextValue | DecimalValue | FractionValue => {
  if (!numberLikeRegex.test(input_str)) {
    return { type: "text", text: input_str };
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
  return { type: "decimal", decimal: Number(s) };
};

export function stringifyQuantityValue(quantity: FixedValue | Range): string {
  if (quantity.type === "fixed") {
    return stringifyFixedValue(quantity);
  } else {
    return `${stringifyFixedValue({ type: "fixed", value: quantity.min })}-${stringifyFixedValue({ type: "fixed", value: quantity.max })}`;
  }
}

function stringifyFixedValue(quantity: FixedValue): string {
  if (quantity.value.type === "fraction")
    return `${quantity.value.num}/${quantity.value.den}`;
  else if (quantity.value.type === "decimal")
    return String(quantity.value.decimal);
  else return quantity.value.text;
}

// TODO: rename to parseQuantityValue
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

/**
 * Parses a YAML block scalar value (`|` for literal, `\>` for folded) for a given key.
 * - `|` preserves newlines within the block.
 * - `\>` folds newlines into spaces (like a paragraph).
 * Trailing newlines are stripped.
 */
export function parseBlockScalarMetaVar(
  content: string,
  varName: string,
): string | undefined {
  const match = content.match(
    new RegExp(
      `^${varName}:\\s*([|>])\\s*\\r?\\n((?:(?:[ ]+.*|\\s*)(?:\\r?\\n|$))+)`,
      "m",
    ),
  );
  if (!match) return undefined;

  const style = match[1] as "|" | ">";
  const rawBlock = match[2]!;

  // Determine base indentation from the first non-empty line
  const lines = rawBlock.split(/\r?\n/);
  const firstNonEmpty = lines.find((l) => l.trim() !== "");
  /* v8 ignore else -- @preserve */
  if (!firstNonEmpty) return undefined;
  const baseIndent = firstNonEmpty.match(/^([ ]*)/)![1]!.length;

  // Strip base indentation from each line
  const stripped = lines
    .map((line) => (line.trim() === "" ? "" : line.slice(baseIndent)))
    // Remove trailing empty lines
    .join("\n")
    .replace(/\n+$/, "");

  if (style === "|") {
    // Literal: preserve newlines
    return stripped;
  }

  // Folded: replace single newlines with spaces, preserve double newlines as paragraph breaks
  return stripped
    .replace(/\n\n/g, "\0")
    .replace(/\n/g, " ")
    .replace(/\0/g, "\n");
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

/**
 * Extracts all top-level metadata keys from frontmatter content.
 * Only captures keys at the start of a line (not nested keys).
 */
function extractAllMetadataKeys(content: string): string[] {
  const keys: string[] = [];
  for (const match of content.matchAll(metadataKeyRegex)) {
    keys.push(match[1]!.trim());
  }
  return [...new Set(keys)]; // deduplicate
}

/**
 * Parses a nested YAML-style object from frontmatter content.
 * Handles indented key-value pairs under a parent key, including deeply nested objects.
 */
export function parseNestedMetaVar(
  content: string,
  varName: string,
): MetadataObject | undefined {
  const match = content.match(nestedMetaVarRegex(varName));
  if (!match) return undefined;

  const nestedContent = match[1]!;
  return parseNestedBlock(nestedContent);
}

/**
 * Parses a block of indented YAML-like content into a nested object.
 * Recursively handles nested objects when a key has no value but has indented children.
 *
 * @remarks
 * Only spaces are allowed for indentation (tabs are rejected), following YAML spec.
 */
export function parseNestedBlock(content: string): MetadataObject | undefined {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return undefined;

  // Determine base indentation from first line (spaces only)
  const baseIndentMatch = lines[0]!.match(/^(\s*)/);
  if (baseIndentMatch?.[0]?.includes("\t")) {
    throw new NoTabAsIndentError();
  }
  // We know that the regex will return a number of spaces (0+)
  const baseIndent = baseIndentMatch?.[1]?.length as number;

  // If the block itself is a list (not an object), return undefined
  // so the caller can fall through to parseListMetaVar
  if (lines[0]!.trim().startsWith("- ")) return undefined;

  const result: MetadataObject = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Check for tabs in indentation - not allowed
    const leadingWhitespace = line.match(/^(\s*)/)?.[1];
    if (leadingWhitespace && leadingWhitespace.includes("\t")) {
      throw new NoTabAsIndentError();
    }

    const currentIndent = leadingWhitespace!.length;

    // Less indentation than base = end of this block
    if (currentIndent < baseIndent) {
      break;
    }

    // More indentation than base = belongs to a child (skip, handled recursively)
    if (currentIndent !== baseIndent) {
      throw new BadIndentationError();
    }

    // Parse key: value from this line
    const keyValueMatch = line.match(/^[ ]*([^:\n]+?):\s*(.*)$/);
    if (!keyValueMatch) {
      i++;
      continue;
    }

    const key = keyValueMatch[1]!.trim();
    const rawValue = keyValueMatch[2]!.trim();

    if (rawValue === "") {
      // Empty value means this key has nested children
      // Collect all following lines with greater indentation
      const childLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const childLine = lines[j]!;
        const childIndent = childLine.match(/^([ ]*)/)?.[1]?.length;
        if (childIndent && childIndent > baseIndent) {
          childLines.push(childLine);
          j++;
        } else {
          break;
        }
      }

      // v8 ignore else -- @preserve
      if (childLines.length > 0) {
        // Check if children are a list (start with `-`)
        const firstChildTrimmed = childLines[0]!.trim();
        if (firstChildTrimmed.startsWith("- ")) {
          // Reconstruct content and reuse parseListMetaVar
          const reconstructedContent = `${key}:\n${childLines.join("\n")}`;
          const listResult = parseListMetaVar(reconstructedContent, key);
          // v8 ignore else -- @preserve
          if (listResult) {
            result[key] = listResult.map(
              (item) => parseMetadataValue(item) as string | number,
            );
          }
        } else {
          // Parse as nested object
          const childContent = childLines.join("\n");
          const nested = parseNestedBlock(childContent);
          // v8 ignore else -- @preserve
          if (nested) {
            result[key] = nested;
          }
        }
      }
      i = j;
    } else {
      // Has a value, parse it
      result[key] = parseMetadataValue(rawValue);
      i++;
    }
  }

  return result;
}

/**
 * Parses a raw string value into appropriate type (number, string, or array).
 */
function parseMetadataValue(rawValue: string): MetadataValue {
  // Check for inline array [a, b, c]
  if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
    return rawValue
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim());
  }

  // Check for number (integer or decimal)
  if (numericValueRegex.test(rawValue)) {
    return Number(rawValue);
  }

  // Return as string
  return rawValue;
}

/**
 * Detects and parses any metadata value (simple, list, nested object, or numeric).
 */
function parseAnyMetaVar(
  content: string,
  varName: string,
): MetadataValue | undefined {
  // Try nested object first (key followed by indented content)
  const nested = parseNestedMetaVar(content, varName);
  if (nested) return nested;

  // Try list (inline [...] or YAML-style - items)
  const list = parseListMetaVar(content, varName);
  if (list) return list;

  // Try simple value
  const simple = parseSimpleMetaVar(content, varName);
  if (simple) return parseMetadataValue(simple);

  return undefined;
}

export function extractMetadata(content: string): MetadataExtract {
  const metadata: Metadata = {};
  let servings: number | undefined = undefined;

  // Is there front-matter at all?
  const metadataContent = content.match(metadataRegex)?.[2];
  if (!metadataContent) {
    return { metadata };
  }

  // Track keys that have been handled with special logic
  const handledKeys = new Set<string>([
    // Simple string fields
    "title",
    "author",
    "locale",
    "introduction",
    "description",
    "course",
    "category",
    "diet",
    "cuisine",
    "difficulty",
    // Source fields
    "source",
    "source.name",
    "source.url",
    "source.author",
    // Time fields
    "prep time",
    "time.prep",
    "cook time",
    "time.cook",
    "time required",
    "time",
    "duration",
    // Image fields
    "image",
    "picture",
    "images",
    "pictures",
    // Unit system
    "unit system",
    // Scaling fields
    "servings",
    "yield",
    "serves",
    // List fields
    "tags",
  ]);

  // Simple string metadata variables
  for (const metaVar of [
    "title",
    "author",
    "locale",
    "introduction",
    "description",
    "course",
    "category",
    "diet",
    "cuisine",
    "difficulty",
  ] as const) {
    // For description and introduction, try block scalar syntax first
    if (metaVar === "description" || metaVar === "introduction") {
      const blockValue = parseBlockScalarMetaVar(metadataContent, metaVar);
      if (blockValue) {
        metadata[metaVar] = blockValue;
        continue;
      }
    }
    const stringMetaValue = parseSimpleMetaVar(metadataContent, metaVar);
    if (stringMetaValue) metadata[metaVar] = stringMetaValue;
  }

  // Source: can be simple string, dot-notation, OR nested object
  const sourceNested = parseNestedMetaVar(metadataContent, "source");
  const sourceTxt = parseSimpleMetaVar(metadataContent, "source");
  const sourceName = parseSimpleMetaVar(metadataContent, "source.name");
  const sourceUrl = parseSimpleMetaVar(metadataContent, "source.url");
  const sourceAuthor = parseSimpleMetaVar(metadataContent, "source.author");

  if (sourceNested) {
    // YAML-style nested object
    const source: MetadataSource = {};
    // v8 ignore else -- @preserve
    if (typeof sourceNested.name === "string") source.name = sourceNested.name;
    // v8 ignore else -- @preserve
    if (typeof sourceNested.url === "string") source.url = sourceNested.url;
    // v8 ignore else -- @preserve
    if (typeof sourceNested.author === "string")
      source.author = sourceNested.author;
    // v8 ignore else -- @preserve
    if (Object.keys(source).length > 0) metadata.source = source;
  } else if (sourceName || sourceAuthor || sourceUrl) {
    // Dot-notation structured source
    const source: MetadataSource = {};
    if (sourceName) source.name = sourceName;
    // v8 ignore else -- @preserve
    if (sourceUrl) source.url = sourceUrl;
    if (sourceAuthor) source.author = sourceAuthor;
    metadata.source = source;
  } else if (sourceTxt) {
    // Simple string source (backwards compatible)
    metadata.source = sourceTxt;
  }

  // Time: can be dot-notation, legacy keys, OR nested object
  const timeNested = parseNestedMetaVar(metadataContent, "time");
  const prepTime =
    parseSimpleMetaVar(metadataContent, "prep time") ??
    parseSimpleMetaVar(metadataContent, "time.prep");
  const cookTime =
    parseSimpleMetaVar(metadataContent, "cook time") ??
    parseSimpleMetaVar(metadataContent, "time.cook");
  const totalTime =
    parseSimpleMetaVar(metadataContent, "time required") ??
    parseSimpleMetaVar(metadataContent, "time") ??
    parseSimpleMetaVar(metadataContent, "duration");

  if (timeNested) {
    // YAML-style nested object
    const time: MetadataTime = {};
    // v8 ignore else -- @preserve
    if (typeof timeNested.prep === "string") time.prep = timeNested.prep;
    // v8 ignore else -- @preserve
    if (typeof timeNested.cook === "string") time.cook = timeNested.cook;
    // v8 ignore else -- @preserve
    if (typeof timeNested.total === "string") time.total = timeNested.total;
    // v8 ignore else -- @preserve
    if (Object.keys(time).length > 0) metadata.time = time;
  } else if (prepTime || cookTime || totalTime) {
    const time: MetadataTime = {};
    if (prepTime) time.prep = prepTime;
    if (cookTime) time.cook = cookTime;
    if (totalTime) time.total = totalTime;
    metadata.time = time;
  }

  // Image: normalize aliases
  const image =
    parseSimpleMetaVar(metadataContent, "image") ??
    parseSimpleMetaVar(metadataContent, "picture");
  if (image) metadata.image = image;

  // Images: normalize aliases
  const images =
    parseListMetaVar(metadataContent, "images") ??
    parseListMetaVar(metadataContent, "pictures");
  if (images) metadata.images = images;

  // Unit system (case-insensitive normalization)
  let unitSystem: SpecificUnitSystem | undefined;
  const unitSystemRaw = parseSimpleMetaVar(metadataContent, "unit system");
  if (unitSystemRaw) {
    metadata.unitSystem = unitSystemRaw;
    const unitSystemMap: Record<string, SpecificUnitSystem> = {
      metric: "metric",
      us: "US",
      uk: "UK",
      jp: "JP",
    };
    unitSystem = unitSystemMap[unitSystemRaw.toLowerCase()];
  }

  // Scaling metadata variables (servings, yield, serves)
  for (const metaVar of ["servings", "yield", "serves"] as const) {
    const scalingMetaValue = parseScalingMetaVar(metadataContent, metaVar);
    if (scalingMetaValue && scalingMetaValue[1]) {
      metadata[metaVar] = scalingMetaValue[1];
      servings = scalingMetaValue[0];
    }
  }

  // Tags
  const tags = parseListMetaVar(metadataContent, "tags");
  if (tags) metadata.tags = tags;

  // Dynamic parsing: capture all additional keys not handled above
  const allKeys = extractAllMetadataKeys(metadataContent);
  for (const key of allKeys) {
    if (handledKeys.has(key)) continue;

    const value = parseAnyMetaVar(metadataContent, key);
    if (value !== undefined) {
      metadata[key] = value;
    }
  }

  return { metadata, servings, unitSystem };
}

export function isPositiveIntegerString(str: string): boolean {
  return /^\d+$/.test(str);
}

export function unionOfSets<T>(s1: Set<T>, s2: Set<T>): Set<T> {
  const result = new Set(s1);
  for (const item of s2) {
    result.add(item);
  }
  return result;
}

/**
 * Returns a canonical string key from sorted alternative indices for grouping quantities.
 * Used to determine if two ingredient items have the same alternatives and can be summed together.
 * @param alternatives - Array of alternative ingredient references
 * @returns A string of sorted indices (e.g., "0,2,5") or null if no alternatives
 */
export function getAlternativeSignature(
  alternatives: { index: number }[] | undefined,
): string | null {
  if (!alternatives || alternatives.length === 0) return null;
  return alternatives
    .map((a) => a.index)
    .sort((a, b) => a - b)
    .join(",");
}
