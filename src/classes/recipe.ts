import type {
  Metadata,
  Ingredient,
  IngredientItem,
  Timer,
  Step,
  Note,
  Cookware,
  MetadataExtract,
  CookwareItem,
} from "../types";
import { Section } from "./section";
import {
  tokensRegex,
  commentRegex,
  blockCommentRegex,
  metadataRegex,
  ingredientAliasRegex,
  floatRegex,
} from "../regex";
import {
  flushPendingItems,
  flushPendingNote,
  findAndUpsertIngredient,
  findAndUpsertCookware,
  parseQuantityInput,
  extractMetadata,
} from "../parser_helpers";
import {
  addQuantities,
  getDefaultQuantityValue,
  multiplyQuantityValue,
  type Quantity,
} from "../units";

/**
 * Recipe parser.
 *
 * ## Usage
 *
 * You can either directly provide the recipe string when creating the instance
 * e.g. `const recipe = new Recipe('Add @eggs{3}')`, or create it first and then pass
 * the recipe string to the {@link Recipe.parse | parse()} method.
 *
 * Look at the [properties](#properties) to see how the recipe's properties are parsed.
 *
 * @category Classes
 *
 * @example
 * ```typescript
 * import { Recipe } from "@tmlmt/cooklang-parser";
 *
 * const recipeString = `
 * ---
 * title: Pancakes
 * tags: [breakfast, easy]
 * ---
 * Crack the @eggs{3} with @flour{100%g} and @milk{200%mL}
 *
 * Melt some @butter{50%g} in a #pan on medium heat.
 *
 * Cook for ~{5%minutes} on each side.
 * `
 * const recipe = new Recipe(recipeString);
 * ```
 */
export class Recipe {
  /**
   * The parsed recipe metadata.
   */
  metadata: Metadata = {};
  /**
   * The parsed recipe ingredients.
   */
  ingredients: Ingredient[] = [];
  /**
   * The parsed recipe sections.
   */
  sections: Section[] = [];
  /**
   * The parsed recipe cookware.
   */
  cookware: Cookware[] = [];
  /**
   * The parsed recipe timers.
   */
  timers: Timer[] = [];
  /**
   * The parsed recipe servings. Used for scaling. Parsed from one of
   * {@link Metadata.servings}, {@link Metadata.yield} or {@link Metadata.serves}
   * metadata fields.
   *
   * @see {@link Recipe.scaleBy | scaleBy()} and {@link Recipe.scaleTo | scaleTo()} methods
   */
  servings?: number;

  /**
   * Creates a new Recipe instance.
   * @param content - The recipe content to parse.
   */
  constructor(content?: string) {
    if (content) {
      this.parse(content);
    }
  }

  /**
   * Parses a recipe from a string.
   * @param content - The recipe content to parse.
   */
  parse(content: string) {
    const cleanContent = content
      .replace(metadataRegex, "")
      .replace(commentRegex, "")
      .replace(blockCommentRegex, "")
      .trim()
      .split(/\r\n?|\n/);

    const { metadata, servings }: MetadataExtract = extractMetadata(content);
    this.metadata = metadata;
    this.servings = servings;

    let blankLineBefore = true;
    let section: Section = new Section();
    const items: Step["items"] = [];
    let note: Note["note"] = "";
    let inNote = false;

    for (const line of cleanContent) {
      if (line.trim().length === 0) {
        flushPendingItems(section, items);
        note = flushPendingNote(section, note);
        blankLineBefore = true;
        inNote = false;
        continue;
      }

      if (line.startsWith("=")) {
        flushPendingItems(section, items);
        note = flushPendingNote(section, note);

        if (this.sections.length === 0 && section.isBlank()) {
          section.name = line.substring(1).trim();
        } else {
          if (!section.isBlank()) {
            this.sections.push(section);
          }
          section = new Section(line.substring(1).trim());
        }
        blankLineBefore = true;
        inNote = false;
        continue;
      }

      if (blankLineBefore && line.startsWith(">")) {
        flushPendingItems(section, items);
        note = flushPendingNote(section, note);
        note += line.substring(1).trim();
        inNote = true;
        blankLineBefore = false;
        continue;
      }

      if (inNote) {
        if (line.startsWith(">")) {
          note += " " + line.substring(1).trim();
        } else {
          note += " " + line.trim();
        }
        blankLineBefore = false;
        continue;
      }

      note = flushPendingNote(section, note);

      let cursor = 0;
      for (const match of line.matchAll(tokensRegex)) {
        const idx = match.index;
        if (idx > cursor) {
          items.push({ type: "text", value: line.slice(cursor, idx) });
        }

        const groups = match.groups!;

        if (groups.mIngredientName || groups.sIngredientName) {
          const name = (groups.mIngredientName || groups.sIngredientName)!;
          const scalableQuantity =
            (groups.mIngredientQuantityModifier ||
              groups.sIngredientQuantityModifier) !== "=";
          const quantityRaw =
            groups.mIngredientQuantity || groups.sIngredientQuantity;
          const unit = groups.mIngredientUnit || groups.sIngredientUnit;
          const preparation =
            groups.mIngredientPreparation || groups.sIngredientPreparation;
          const modifier =
            groups.mIngredientModifier || groups.sIngredientModifier;
          const optional = modifier === "?";
          const hidden = modifier === "-";
          const reference = modifier === "&";
          const isRecipe = modifier === "@";
          const quantity = quantityRaw
            ? parseQuantityInput(quantityRaw)
            : undefined;
          const aliasMatch = name.match(ingredientAliasRegex);
          let listName, displayName: string;
          if (
            aliasMatch &&
            aliasMatch.groups!.ingredientListName!.trim().length > 0 &&
            aliasMatch.groups!.ingredientDisplayName!.trim().length > 0
          ) {
            listName = aliasMatch.groups!.ingredientListName!.trim();
            displayName = aliasMatch.groups!.ingredientDisplayName!.trim();
          } else {
            listName = name;
            displayName = name;
          }

          const idxsInList = findAndUpsertIngredient(
            this.ingredients,
            {
              name: listName,
              quantity,
              quantityParts: quantity
                ? [
                    {
                      value: quantity,
                      unit,
                      scalable: scalableQuantity,
                    },
                  ]
                : undefined,
              unit,
              optional,
              hidden,
              preparation,
              isRecipe,
            },
            reference,
          );

          const newItem: IngredientItem = {
            type: "ingredient",
            index: idxsInList.ingredientIndex,
            displayName,
          };
          if (idxsInList.quantityPartIndex !== undefined) {
            newItem.quantityPartIndex = idxsInList.quantityPartIndex;
          }
          items.push(newItem);
        } else if (groups.mCookwareName || groups.sCookwareName) {
          const name = (groups.mCookwareName || groups.sCookwareName)!;
          const modifier = groups.mCookwareModifier || groups.sCookwareModifier;
          const quantityRaw =
            groups.mCookwareQuantity || groups.sCookwareQuantity;
          const optional = modifier === "?";
          const hidden = modifier === "-";
          const reference = modifier === "&";
          const quantity = quantityRaw
            ? parseQuantityInput(quantityRaw)
            : undefined;

          const idxsInList = findAndUpsertCookware(
            this.cookware,
            {
              name,
              quantity,
              quantityParts: quantity ? [quantity] : undefined,
              optional,
              hidden,
            },
            reference,
          );
          items.push({
            type: "cookware",
            index: idxsInList.cookwareIndex,
            quantityPartIndex: idxsInList.quantityPartIndex,
          } as CookwareItem);
        } else if (groups.timerQuantity !== undefined) {
          const durationStr = groups.timerQuantity.trim();
          const unit = (groups.timerUnit || "").trim();
          if (!unit) {
            throw new Error("Timer missing unit");
          }
          const name = groups.timerName || undefined;
          const duration = parseQuantityInput(durationStr);
          const timerObj: Timer = {
            name,
            duration,
            unit,
          };
          items.push({ type: "timer", index: this.timers.push(timerObj) - 1 });
        }

        cursor = idx + match[0].length;
      }

      if (cursor < line.length) {
        items.push({ type: "text", value: line.slice(cursor) });
      }

      blankLineBefore = false;
    }

    // End of content reached: pushing all temporarily saved elements
    flushPendingItems(section, items);
    note = flushPendingNote(section, note);
    if (!section.isBlank()) {
      this.sections.push(section);
    }
  }

  /**
   * Scales the recipe to a new number of servings. In practice, it calls
   * {@link Recipe.scaleBy | scaleBy} with a factor corresponding to the ratio between `newServings`
   *   and the recipe's {@link Recipe.servings | servings} value.
   * @param newServings - The new number of servings.
   * @returns A new Recipe instance with the scaled ingredients.
   * @throws `Error` if the recipe does not contains an initial {@link Recipe.servings | servings} value
   */
  scaleTo(newServings: number): Recipe {
    const originalServings = this.getServings();

    if (originalServings === undefined || originalServings === 0) {
      throw new Error("Error scaling recipe: no initial servings value set");
    }

    const factor = newServings / originalServings;
    return this.scaleBy(factor);
  }

  /**
   * Scales the recipe by a factor.
   * @param factor - The factor to scale the recipe by.
   * @returns A new Recipe instance with the scaled ingredients.
   */
  scaleBy(factor: number): Recipe {
    const newRecipe = this.clone();

    const originalServings = newRecipe.getServings();

    if (originalServings === undefined || originalServings === 0) {
      throw new Error("Error scaling recipe: no initial servings value set");
    }

    newRecipe.ingredients = newRecipe.ingredients
      .map((ingredient) => {
        // Scale first individual parts of total quantity depending on whether they are scalable or not
        if (ingredient.quantityParts) {
          ingredient.quantityParts = ingredient.quantityParts.map(
            (quantityPart) => {
              if (
                quantityPart.value.type === "fixed" &&
                quantityPart.value.value.type === "text"
              ) {
                return quantityPart;
              }
              return {
                ...quantityPart,
                value: multiplyQuantityValue(
                  quantityPart.value,
                  quantityPart.scalable ? factor : 1,
                ),
              };
            },
          );
          // Recalculate total quantity from quantity parts
          if (ingredient.quantityParts.length === 1) {
            ingredient.quantity = ingredient.quantityParts[0]!.value;
            ingredient.unit = ingredient.quantityParts[0]!.unit;
          } else {
            const totalQuantity = ingredient.quantityParts.reduce(
              (acc, val) =>
                addQuantities(acc, { value: val.value, unit: val.unit }),
              { value: getDefaultQuantityValue() } as Quantity,
            );
            ingredient.quantity = totalQuantity.value;
            ingredient.unit = totalQuantity.unit;
          }
        }
        return ingredient;
      })
      .filter((ingredient) => ingredient.quantity !== null);

    newRecipe.servings = originalServings * factor;

    if (newRecipe.metadata.servings && this.metadata.servings) {
      if (
        floatRegex.test(String(this.metadata.servings).replace(",", ".").trim())
      ) {
        const servingsValue = parseFloat(
          String(this.metadata.servings).replace(",", "."),
        );
        newRecipe.metadata.servings = String(servingsValue * factor);
      }
    }

    if (newRecipe.metadata.yield && this.metadata.yield) {
      if (
        floatRegex.test(String(this.metadata.yield).replace(",", ".").trim())
      ) {
        const yieldValue = parseFloat(
          String(this.metadata.yield).replace(",", "."),
        );
        newRecipe.metadata.yield = String(yieldValue * factor);
      }
    }

    if (newRecipe.metadata.serves && this.metadata.serves) {
      if (
        floatRegex.test(String(this.metadata.serves).replace(",", ".").trim())
      ) {
        const servesValue = parseFloat(
          String(this.metadata.serves).replace(",", "."),
        );
        newRecipe.metadata.serves = String(servesValue * factor);
      }
    }

    return newRecipe;
  }

  /**
   * Gets the number of servings for the recipe.
   * @private
   * @returns The number of servings, or undefined if not set.
   */
  private getServings(): number | undefined {
    if (this.servings) {
      return this.servings;
    }
    return undefined;
  }

  /**
   * Clones the recipe.
   * @returns A new Recipe instance with the same properties.
   */
  clone(): Recipe {
    const newRecipe = new Recipe();
    // deep copy
    newRecipe.metadata = JSON.parse(JSON.stringify(this.metadata)) as Metadata;
    newRecipe.ingredients = JSON.parse(
      JSON.stringify(this.ingredients),
    ) as Ingredient[];
    newRecipe.sections = JSON.parse(JSON.stringify(this.sections)) as Section[];
    newRecipe.cookware = JSON.parse(
      JSON.stringify(this.cookware),
    ) as Cookware[];
    newRecipe.timers = JSON.parse(JSON.stringify(this.timers)) as Timer[];
    newRecipe.servings = this.servings;
    return newRecipe;
  }
}
