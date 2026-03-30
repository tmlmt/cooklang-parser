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
  TextItem,
  TextAttribute,
  ArbitraryScalable,
  FixedNumericValue,
  Yield,
} from "../types";
import {
  metadataRegex,
  metadataKeyRegex,
  nestedMetaVarRegex,
  numericValueRegex,
  rangeRegex,
  numberLikeRegex,
  yieldMetaValueRegex,
  quantityAlternativeRegex,
  markdownRegex,
} from "../regex";
import { Section as SectionObject } from "../classes/section";
import type { Ingredient, Step, Cookware } from "../types";
import { addQuantityValues } from "../quantities/mutations";
import { getNumericValue } from "../quantities/numeric";
import {
  CannotAddTextValueError,
  InvalidQuantityFormat,
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
 * @param stepVariants - Optional variant names for the step.
 * @param stepOptional - Optional flag for the step.
 * @returns true if the items were pushed, otherwise false.
 */
export function flushPendingItems(
  section: SectionObject,
  items: Step["items"],
  stepVariants?: string[],
  stepOptional?: boolean,
): boolean {
  if (items.length > 0) {
    const step: Step = { type: "step", items: [...items] };
    if (stepVariants) step.variants = stepVariants;
    if (stepOptional) step.optional = true;
    section.content.push(step);
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

export function parseQuantityValue(input_str: string): FixedValue | Range {
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

/**
 * Parses a quantity string with unit separated by `%` (e.g. `"500%g"`).
 * If no `%` is present, the entire string is treated as a value with no unit.
 * @param input - The quantity string to parse.
 * @returns An object with parsed `value` and optional `unit`.
 */
export function parseQuantityWithUnit(input: string): {
  value: FixedValue | Range;
  unit?: string;
} {
  const trimmed = input.trim();
  const separatorIndex = trimmed.indexOf("%");
  if (separatorIndex === -1) {
    return { value: parseQuantityValue(trimmed) };
  }
  const valuePart = trimmed.slice(0, separatorIndex).trim();
  const unitPart = trimmed.slice(separatorIndex + 1).trim();
  return {
    value: parseQuantityValue(valuePart),
    unit: unitPart || undefined,
  };
}

/**
 * Parses a date string using a specific format pattern.
 * The format must contain `DD`, `MM`, and `YYYY` separated by a single delimiter
 * character (e.g. `.`, `/`, `-`).
 *
 * @param input - The date string to parse (e.g. `"05.06.2025"`).
 * @param format - The format pattern (e.g. `"DD.MM.YYYY"`).
 * @returns A Date object.
 * @throws Error if the input doesn't match the format or produces an invalid date.
 */
export function parseDateFromFormat(input: string, format: string): Date {
  // Extract delimiter from format (first non-letter character)
  const delimiterMatch = format.match(/[^A-Za-z]/);
  if (!delimiterMatch) {
    throw new Error(`Invalid date format: ${format}. No delimiter found.`);
  }
  const delimiter = delimiterMatch[0];

  const formatParts = format.split(delimiter);
  const inputParts = input.trim().split(delimiter);

  if (formatParts.length !== 3 || inputParts.length !== 3) {
    throw new Error(
      `Invalid date input "${input}" for format "${format}". Expected 3 parts.`,
    );
  }

  let day = 0,
    month = 0,
    year = 0;

  for (let i = 0; i < 3; i++) {
    const token = formatParts[i]!.toUpperCase();
    const value = parseInt(inputParts[i]!, 10);
    if (isNaN(value)) {
      throw new Error(
        `Invalid date input "${input}": non-numeric part "${inputParts[i]}".`,
      );
    }
    if (token === "DD") day = value;
    else if (token === "MM") month = value;
    else if (token === "YYYY") year = value;
    else
      throw new Error(
        `Unknown token "${formatParts[i]}" in format "${format}"`,
      );
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date: "${input}" does not form a valid date.`);
  }
  return date;
}

/**
 * Disambiguates day and month from two numeric parts.
 * Defaults to day-first (DD.MM), but if the second part \> 12
 * it must be the day, so we swap to interpret as month-first (MM.DD).
 */
function disambiguateDayMonth(
  first: number,
  second: number,
  year: number,
): [day: number, month: number, year: number] {
  // If the second part > 12, it must be the day → input was month-first
  if (second > 12 && first <= 12) {
    return [second, first, year];
  }
  // Otherwise default to day-first
  return [first, second, year];
}

/**
 * Parses a date string with fuzzy format detection.
 *
 * Supports delimiters `.`, `/`, `-`.
 * - If the first part is a 4-digit year → `YYYY.MM.DD`
 * - Otherwise defaults to `DD.MM.YYYY` (day first)
 * - If the first part \> 12 it must be the day, confirming day-first
 * - If the second part \> 12 it must be the day, meaning month-first input,
 *   but we still default to day-first so this produces an error (invalid month)
 *   unless the value is unambiguous
 *
 * @param input - The date string to parse.
 * @returns A Date object.
 * @throws Error if the input cannot be parsed as a valid date.
 */
export function parseFuzzyDate(input: string): Date {
  const trimmed = input.trim();

  // Detect delimiter
  const delimiterMatch = trimmed.match(/[./-]/);
  if (!delimiterMatch) {
    throw new Error(`Cannot parse date "${input}": no delimiter found.`);
  }
  const delimiter = delimiterMatch[0];
  const parts = trimmed.split(delimiter);
  if (parts.length !== 3) {
    throw new Error(
      `Cannot parse date "${input}": expected 3 parts, got ${parts.length}.`,
    );
  }

  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => isNaN(n))) {
    throw new Error(`Cannot parse date "${input}": non-numeric parts found.`);
  }

  let day: number, month: number, year: number;

  // If first part is a 4-digit year (>= 1000), assume YYYY.MM.DD
  if (nums[0]! >= 1000) {
    year = nums[0]!;
    month = nums[1]!;
    day = nums[2]!;
  }
  // If last part is a 4-digit year, default to DD.MM.YYYY
  else if (nums[2]! >= 1000) {
    [day, month, year] = disambiguateDayMonth(nums[0]!, nums[1]!, nums[2]!);
  }
  // All short numbers — assume DD.MM.YY with 2-digit year
  else {
    if (nums[2]! >= 100)
      throw new Error(`Invalid date: "${input}" does not form a valid date.`);
    [day, month] = disambiguateDayMonth(nums[0]!, nums[1]!, 0);
    year = 2000 + nums[2]!;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date: "${input}" does not form a valid date.`);
  }
  return date;
}

/**
 * Parses markdown formatting in a text string and returns an array of TextItems.
 *
 * Supported syntax:
 * - Bold: `**text**` or `__text__` (underscores at word boundaries)
 * - Italic: `*text*` or `_text_` (underscores at word boundaries)
 * - Bold+italic: `***text***`, `___text___`, or mixed combos like `**_text_**`
 * - Links: `[text](url)`
 * - Inline code: backtick-delimited spans
 * - Escaping: `\*`, `\_`, or backslash-backtick to produce literal characters
 *
 * @param text - The raw text to parse for markdown formatting.
 * @returns An array of TextItem objects, with formatting attributes where detected.
 */
export function parseMarkdownSegments(text: string): TextItem[] {
  const items: TextItem[] = [];
  let cursor = 0;

  for (const match of text.matchAll(markdownRegex)) {
    const idx = match.index;

    // Push preceding plain text
    if (idx > cursor) {
      items.push({ type: "text", value: text.slice(cursor, idx) });
    }

    // Determine which group matched
    const [
      ,
      escaped, // group 1: escaped character
      code, // group 2: inline code
      linkText, // group 3: link text
      linkUrl, // group 4: link url
      tripleAst, // group 5: ***bold+italic***
      tripleUnd, // group 6: ___bold+italic___
      astUnd, // group 7: **_bold+italic_**
      undAst, // group 8: __*bold+italic*__
      astUndUnd, // group 9: *__bold+italic__*
      undAstAst, // group 10: _**bold+italic**_
      boldAst, // group 11: **bold**
      boldUnd, // group 12: __bold__
      italicAst, // group 13: *italic*
      italicUnd, // group 14: _italic_
    ] = match;

    let value: string;
    let attribute: TextAttribute | undefined;
    let href: string | undefined;

    if (escaped !== undefined) {
      // Escaped character → plain text
      items.push({ type: "text", value: escaped });
      cursor = idx + match[0].length;
      continue;
    } else if (code !== undefined) {
      value = code;
      attribute = "code";
    } else if (linkText !== undefined) {
      value = linkText;
      attribute = "link";
      href = linkUrl;
    } else if (
      tripleAst !== undefined ||
      tripleUnd !== undefined ||
      astUnd !== undefined ||
      undAst !== undefined ||
      astUndUnd !== undefined ||
      undAstAst !== undefined
    ) {
      value = (tripleAst ??
        tripleUnd ??
        astUnd ??
        undAst ??
        astUndUnd ??
        undAstAst)!;
      attribute = "bold+italic";
    } else if (boldAst !== undefined || boldUnd !== undefined) {
      value = (boldAst ?? boldUnd)!;
      attribute = "bold";
    } else {
      value = (italicAst ?? italicUnd)!;
      attribute = "italic";
    }

    const item: TextItem = { type: "text", value };
    // v8 ignore else -- @preserve
    if (attribute) item.attribute = attribute;
    if (href) item.href = href;
    items.push(item);
    cursor = idx + match[0].length;
  }

  // Push remaining plain text
  if (cursor < text.length) {
    items.push({ type: "text", value: text.slice(cursor) });
  }

  return items;
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

/**
 * Parses the raw quantity string inside a `{{...}}` arbitrary scalable.
 * The input should be the inner part, e.g. `"300%g"` or `"1%bread|500%g"`.
 *
 * @param raw - The raw quantity string from inside `{{}}`.
 * @returns An {@link ArbitraryScalable} with `quantity` and optional `unit`.
 * @throws {@link InvalidQuantityFormat} if the value is non-numeric.
 */
export function parseArbitraryQuantity(raw: string): ArbitraryScalable {
  const quantityMatch = raw.trim().match(quantityAlternativeRegex);
  /* v8 ignore next 4 -- @preserve: defensive guard; regex always matches */
  if (!quantityMatch?.groups) {
    throw new InvalidQuantityFormat(
      raw,
      "Arbitrary quantities must have a numerical value",
    );
  }
  const value = parseQuantityValue(quantityMatch.groups.quantity!);
  const unit = quantityMatch.groups.unit;
  if (!value || (value.type === "fixed" && value.value.type === "text")) {
    throw new InvalidQuantityFormat(
      raw,
      "Arbitrary quantities must have a numerical value",
    );
  }
  const arbitrary: ArbitraryScalable = {
    quantity: value as FixedNumericValue,
  };
  if (unit) arbitrary.unit = unit;
  return arbitrary;
}

/**
 * Parses a servings or serves metadata value.
 * Returns both the raw value (number if numeric, string otherwise) and a numeric
 * value for scaling (defaults to 1 when the raw value is non-numeric).
 *
 * @param content - The metadata content string.
 * @param varName - The metadata variable name (`"servings"` or `"serves"`).
 * @returns An object with `numericValue` and `rawValue`, or undefined if not found.
 */
export function parseServingsMetaVar(
  content: string,
  varName: "servings" | "serves",
): { numericValue: number; rawValue: number | string } | undefined {
  const raw = parseSimpleMetaVar(content, varName);
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (isNaN(num)) {
    return { numericValue: 1, rawValue: raw };
  }
  return { numericValue: num, rawValue: num };
}

/**
 * Parses a yield metadata value.
 * Accepts both:
 * - Complex format: `yield: about {{300%g}} of bread`
 * - Plain format: `yield: 300%g` or `yield: 2`
 *
 * @param content - The metadata content string.
 * @returns A {@link Yield} object, or undefined if not found.
 * @throws {@link InvalidQuantityFormat} if the value is non-numeric.
 */
export function parseYieldMetaVar(content: string): Yield | undefined {
  const match = content.match(yieldMetaValueRegex);
  if (!match) return undefined;

  // Complex format branch: matched the {{...}} pattern
  if (match.groups?.arbitraryQuantity) {
    const parsed = parseArbitraryQuantity(match.groups.arbitraryQuantity);
    const result: Yield = {
      quantity: parsed.quantity,
    };
    if (parsed.unit) result.unit = parsed.unit;
    if (match.groups.servingsPrefix) {
      result.textBefore = match.groups.servingsPrefix;
    }
    if (match.groups.servingsSuffix) {
      result.textAfter = match.groups.servingsSuffix;
    }
    return result;
  }

  // Plain format branch: matched quantityAlternativeRegex (e.g. "300%g" or "2")
  if (match.groups?.quantity) {
    const result: Yield = {
      quantity: parseQuantityValue(match.groups.quantity),
    };
    if (match.groups.unit) result.unit = match.groups.unit;
    return result;
  }

  return undefined;
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
): MetadataObject | (string | number | MetadataObject)[] | undefined {
  const match = content.match(nestedMetaVarRegex(varName));
  if (!match) return undefined;

  const nestedContent = match[1]!;
  const lines = nestedContent
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  // If the block is a list, parse it as list items (may contain objects)
  if (lines.length > 0 && lines[0]!.trim().startsWith("- ")) {
    return parseListItems(lines);
  }

  return parseNestedBlock(nestedContent);
}

/**
 * Parses a block of indented YAML-like content into a nested object.
 * Recursively handles nested objects when a key has no value but has indented children.
 *
 * @throws {@link NoTabAsIndentError} if the indentation of the first line contains a tab (not handled)
 * @throws {@link BadIndentationError} when a line has inconsistent indentation (not the same as base or greater for children)
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
    const keyValueMatch = line.match(/^ *([^:\n]+?):\s*(.*)$/);
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
        const childIndent = childLine.match(/^( *)/)?.[1]?.length;
        if (childIndent && childIndent > baseIndent) {
          childLines.push(childLine);
          j++;
        } else {
          break;
        }
      }

      if (childLines.length > 0) {
        // Check if children are a list (start with `-`)
        const firstChildTrimmed = childLines[0]!.trim();
        if (firstChildTrimmed.startsWith("- ")) {
          result[key] = parseListItems(childLines);
        } else {
          // Parse as nested object
          const childContent = childLines.join("\n");
          const nested = parseNestedBlock(childContent);
          // v8 ignore else -- @preserve
          if (nested) {
            result[key] = nested;
          }
        }
      } else {
        result[key] = "";
      }
      i = j;
    } else {
      // Has a value, parse it
      result[key] = parseSingleLineMetadataValue(rawValue);
      i++;
    }
  }

  return result;
}

/**
 * Parses YAML-style list child lines into an array of values or objects.
 * Handles both simple list items (`- value`) and object items (`- key: value\n  key2: value2`).
 */
function parseListItems(
  childLines: string[],
): (string | number | MetadataObject)[] {
  // Determine the indent level of list markers (the regex also matches 0 space)
  const listIndent = childLines[0]!.match(/^( *)/)?.[1]?.length as number;

  // Split child lines into groups, each starting with a `- ` line
  const groups: string[][] = [];
  let currentGroup: string[] = [];

  for (const line of childLines) {
    const indent = line.match(/^( *)/)?.[1]?.length as number; // the regex also matches 0 space
    if (indent === listIndent && line.trim().startsWith("- ")) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [line];
    } else {
      currentGroup.push(line);
    }
  }
  groups.push(currentGroup);

  // Check if any item is object-style (multi-line or key: value on single line)
  const isObjectItem = (group: string[]) => {
    if (group.length > 1) return true;
    const value = group[0]!.replace(/^\s*-\s*/, "").trim();
    return /^[^:\n]+:\s/.test(value);
  };
  const hasObjectItems = groups.some(isObjectItem);

  if (!hasObjectItems) {
    // Simple list: extract value after `- `
    return groups.map((group) => {
      const value = group[0]!.replace(/^\s*-\s*/, "").trim();
      return parseSingleLineMetadataValue(value) as string | number;
    });
  }

  // List of objects: parse each group as a nested object
  const items: (string | number | MetadataObject)[] = [];
  for (const group of groups) {
    const firstLine = group[0]!;
    const afterDash = firstLine.replace(/^\s*-\s*/, "");

    // Determine content indent (position after `- `)
    const dashPrefixMatch = firstLine.match(/^( *-\s*)/);
    const contentIndent = dashPrefixMatch?.[1]?.length as number; // the regex always matches

    // Reconstruct lines at uniform indent for parseNestedBlock
    const objectLines: string[] = [" ".repeat(contentIndent) + afterDash];
    for (let k = 1; k < group.length; k++) {
      objectLines.push(group[k]!);
    }

    const parsed = parseNestedBlock(objectLines.join("\n"));
    /* v8 ignore else -- @preserve: empty non nested block will in practice be detected earlier */
    if (parsed) {
      items.push(parsed);
    } else {
      items.push(
        parseSingleLineMetadataValue(afterDash.trim()) as string | number,
      );
    }
  }
  return items;
}

/**
 * Parses a raw string value into appropriate type (number, string, or array).
 */
function parseSingleLineMetadataValue(rawValue: string): MetadataValue {
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
  if (simple) return parseSingleLineMetadataValue(simple);

  return undefined;
}

/**
 * Extracts the numeric value from a Yield.
 */
export function getNumericValueFromYield(v: Yield): number {
  /* v8 ignore else -- @preserve */
  if (v.quantity.type === "fixed" && v.quantity.value.type !== "text") {
    return getNumericValue(v.quantity.value);
  }
  /* v8 ignore else -- @preserve */
  if (v.quantity.type === "range") return getNumericValue(v.quantity.min);
  return 1;
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
    "variants",
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

  if (sourceNested && !Array.isArray(sourceNested)) {
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

  if (timeNested && !Array.isArray(timeNested)) {
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
  // Priority for .servings: servings > serves > yield (last write wins)
  const yieldValue = parseYieldMetaVar(metadataContent);
  if (yieldValue) {
    metadata.yield = yieldValue;
    servings = getNumericValueFromYield(yieldValue);
  }
  for (const metaVar of ["serves", "servings"] as const) {
    const result = parseServingsMetaVar(metadataContent, metaVar);
    if (result !== undefined) {
      metadata[metaVar] = result.rawValue;
      servings = result.numericValue;
    }
  }

  // Tags
  const tags = parseListMetaVar(metadataContent, "tags");
  if (tags) metadata.tags = tags;

  // Variants
  const variants = parseListMetaVar(metadataContent, "variants");
  if (variants) metadata.variants = variants;

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
  alternatives: { index: number }[][] | undefined,
): string | null {
  if (!alternatives || alternatives.length === 0) return null;
  return alternatives
    .flat()
    .map((a) => a.index)
    .sort((a, b) => a - b)
    .join(",");
}
