import type {
  Metadata,
  Ingredient,
  IngredientItem,
  Timer,
  Step,
  Note,
  Cookware,
  MetadataExtract,
} from "../types";
import { Section } from "./section";
import {
  tokensRegex,
  commentRegex,
  blockCommentRegex,
  metadataRegex,
} from "../regex";
import {
  findOrPush,
  flushPendingItems,
  flushPendingNote,
  findAndUpsertIngredient,
  findAndUpsertCookware,
  parseQuantityInput,
  extractMetadata,
} from "../parser_helpers";
import { multiplyQuantityValue } from "../units";

/**
 * Represents a recipe.
 * @category Classes
 */
export class Recipe {
  /**
   * The recipe's metadata.
   * @see {@link Metadata}
   */
  metadata: Metadata = {};
  /**
   * The recipe's ingredients.
   * @see {@link Ingredient}
   */
  ingredients: Ingredient[] = [];
  /**
   * The recipe's sections.
   * @see {@link Section}
   */
  sections: Section[] = [];
  /**
   * The recipe's cookware.
   * @see {@link Cookware}
   */
  cookware: Cookware[] = [];
  /**
   * The recipe's timers.
   * @see {@link Timer}
   */
  timers: Timer[] = [];
  /**
   * The recipe's servings. Used for scaling
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
          const quantityRaw =
            groups.mIngredientQuantity || groups.sIngredientQuantity;
          const units = groups.mIngredientUnits || groups.sIngredientUnits;
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

          const idxInList = findAndUpsertIngredient(
            this.ingredients,
            {
              name,
              quantity,
              unit: units,
              optional,
              hidden,
              preparation,
              isRecipe,
            },
            reference,
          );

          const newItem: IngredientItem = {
            type: "ingredient",
            value: idxInList,
          };
          if (reference) {
            newItem.partialQuantity = quantity;
            newItem.partialUnit = units;
            newItem.partialPreparation = preparation;
          }

          items.push(newItem);
        } else if (groups.mCookwareName || groups.sCookwareName) {
          const name = (groups.mCookwareName || groups.sCookwareName)!;
          const modifier = groups.mCookwareModifier || groups.sCookwareModifier;
          const optional = modifier === "?";
          const hidden = modifier === "-";
          const reference = modifier === "&";

          const idxInList = findAndUpsertCookware(
            this.cookware,
            { name, optional, hidden },
            reference,
          );
          items.push({ type: "cookware", value: idxInList });
        } else if (groups.timerQuantity !== undefined) {
          const durationStr = groups.timerQuantity.trim();
          const unit = (groups.timerUnits || "").trim();
          if (!unit) {
            throw new Error("Timer missing units");
          }
          const name = groups.timerName || undefined;
          const duration = parseQuantityInput(durationStr);
          const timerObj: Timer = {
            name,
            duration,
            unit,
          };
          const idxInList = findOrPush(
            this.timers,
            (t) =>
              t.name === timerObj.name &&
              t.duration === timerObj.duration &&
              t.unit === timerObj.unit,
            () => timerObj,
          );
          items.push({ type: "timer", value: idxInList });
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
   * Scales the recipe to a new number of servings.
   * @param newServings - The new number of servings.
   * @returns A new Recipe instance with the scaled ingredients.
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
        if (
          ingredient.quantity &&
          !(
            ingredient.quantity.type === "fixed" &&
            ingredient.quantity.value.type === "text"
          )
        ) {
          ingredient.quantity = multiplyQuantityValue(
            ingredient.quantity,
            factor,
          );
        }
        return ingredient;
      })
      .filter((ingredient) => ingredient.quantity !== null);

    newRecipe.servings = originalServings * factor;

    if (newRecipe.metadata.servings && this.metadata.servings) {
      const servingsValue = parseFloat(this.metadata.servings);
      if (!isNaN(servingsValue)) {
        newRecipe.metadata.servings = String(servingsValue * factor);
      }
    }

    if (newRecipe.metadata.yield && this.metadata.yield) {
      const yieldValue = parseFloat(this.metadata.yield);
      if (!isNaN(yieldValue)) {
        newRecipe.metadata.yield = String(yieldValue * factor);
      }
    }

    if (newRecipe.metadata.serves && this.metadata.serves) {
      const servesValue = parseFloat(this.metadata.serves);
      if (!isNaN(servesValue)) {
        newRecipe.metadata.serves = String(servesValue * factor);
      }
    }

    return newRecipe;
  }

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
    newRecipe.metadata = JSON.parse(JSON.stringify(this.metadata));
    newRecipe.ingredients = JSON.parse(JSON.stringify(this.ingredients));
    newRecipe.sections = JSON.parse(JSON.stringify(this.sections));
    newRecipe.cookware = JSON.parse(JSON.stringify(this.cookware));
    newRecipe.timers = JSON.parse(JSON.stringify(this.timers));
    newRecipe.servings = this.servings;
    return newRecipe;
  }
}
