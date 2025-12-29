import type {
  Metadata,
  Ingredient,
  IngredientExtras,
  IngredientItem,
  IngredientItemQuantity,
  Timer,
  Step,
  Note,
  Cookware,
  MetadataExtract,
  CookwareItem,
  IngredientFlag,
  CookwareFlag,
  RecipeChoices,
  IngredientAlternative,
  FlatOrGroup,
  QuantityWithExtendedUnit,
} from "../types";
import { Section } from "./section";
import {
  tokensRegex,
  commentRegex,
  blockCommentRegex,
  metadataRegex,
  ingredientWithAlternativeRegex,
  ingredientWithGroupKeyRegex,
  ingredientAliasRegex,
  floatRegex,
  quantityAlternativeRegex,
} from "../regex";
import {
  flushPendingItems,
  flushPendingNote,
  findAndUpsertIngredient,
  findAndUpsertCookware,
  parseQuantityInput,
  extractMetadata,
  unionOfSets,
} from "../parser_helpers";
import { multiplyQuantityValue, addEquivalentsAndSimplify } from "../units";
import Big from "big.js";

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
   * The default or manual choice of alternative ingredients
   */
  choices: RecipeChoices = {
    ingredientItems: new Map(),
    ingredientGroups: new Map(),
  };
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
   * Number of items in the recipe. Used for giving ID numbers to items.
   */
  private _itemCount: number = 0;

  /**
   * Creates a new Recipe instance.
   * @param content - The recipe content to parse.
   */
  constructor(content?: string) {
    if (content) {
      this.parse(content);
    }
  }

  private _parseQuantityRecursive(
    quantityRaw: string,
  ): QuantityWithExtendedUnit[] {
    let quantityMatch = quantityRaw.match(quantityAlternativeRegex);
    const quantities: QuantityWithExtendedUnit[] = [];
    while (quantityMatch?.groups) {
      const value = quantityMatch.groups.ingredientQuantityValue
        ? parseQuantityInput(quantityMatch.groups.ingredientQuantityValue)
        : undefined;
      const unit = quantityMatch.groups.ingredientUnit;
      if (value) {
        const newQuantity: QuantityWithExtendedUnit = { quantity: value };
        if (unit) {
          if (unit.startsWith("=")) {
            newQuantity.unit = {
              name: unit.substring(1),
              integerProtected: true,
            };
          } else {
            newQuantity.unit = { name: unit };
          }
        }
        quantities.push(newQuantity);
      } else {
        return quantities;
      }
      quantityMatch = quantityMatch.groups.ingredientAltQuantity
        ? quantityMatch.groups.ingredientAltQuantity.match(
            quantityAlternativeRegex,
          )
        : null;
    }
    return quantities;
  }

  private _parseIngredientWithAlternativeRecursive(
    ingredientMatchString: string,
    items: Step["items"],
  ): void {
    const alternatives: IngredientAlternative[] = [];
    let testString = ingredientMatchString;
    while (true) {
      const match = testString.match(ingredientWithAlternativeRegex);
      if (!match?.groups) break;
      const groups = match.groups;

      // Use variables for readability
      // @<modifiers><name>{quantity%unit|altQuantities}(preparation)[note]|<altIngredients>
      let name = (groups.mIngredientName || groups.sIngredientName)!;

      // 1. We build up the different parts of the Ingredient object
      // Preparation
      const preparation = groups.ingredientPreparation;
      // Flags
      const modifiers = groups.ingredientModifiers;
      const reference = modifiers !== undefined && modifiers.includes("&");
      const flags: IngredientFlag[] = [];
      if (modifiers !== undefined && modifiers.includes("?")) {
        flags.push("optional");
      }
      if (modifiers !== undefined && modifiers.includes("-")) {
        flags.push("hidden");
      }
      if (
        (modifiers !== undefined && modifiers.includes("@")) ||
        groups.ingredientRecipeAnchor
      ) {
        flags.push("recipe");
      }
      // Extras
      let extras: IngredientExtras | undefined = undefined;
      // -- if the ingredient is a recipe, we need to extract the name from the path given
      if (flags.includes("recipe")) {
        extras = { path: `${name}.cook` };
        name = name.substring(name.lastIndexOf("/") + 1);
      }
      // Distinguish name from display name / name alias
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

      const newIngredient: Ingredient = {
        name: listName,
      };
      // Only add parameters if they are non null / non empty
      if (preparation) {
        newIngredient.preparation = preparation;
      }
      if (flags.length > 0) {
        newIngredient.flags = flags;
      }
      if (extras) {
        newIngredient.extras = extras;
      }

      const idxInList = findAndUpsertIngredient(
        this.ingredients,
        newIngredient,
        reference,
      );

      // 2. We build up the ingredient item
      // -- alternative quantities
      const quantity: IngredientItemQuantity | undefined =
        groups.ingredientQuantity
          ? {
              equivalents: this._parseQuantityRecursive(
                groups.ingredientQuantity,
              ),
              scalable: groups.ingredientQuantityModifier !== "=",
            }
          : undefined;

      const alternative: IngredientAlternative = {
        index: idxInList,
        displayName,
      };
      // Only add quantity and note if they exist
      const note = groups.ingredientNote?.trim();
      if (note) {
        alternative.note = note;
      }
      if (quantity) {
        alternative.quantity = quantity;
      }
      alternatives.push(alternative);
      testString = groups.altIngredients || "";
    }

    // Update alternatives list of all processed ingredients
    if (alternatives.length > 1) {
      const alternativesIndexes = alternatives.map((alt) => alt.index);
      for (const index of alternativesIndexes) {
        const ingredient = this.ingredients[index];
        if (ingredient) {
          if (!ingredient.alternatives) {
            ingredient.alternatives = new Set(
              alternativesIndexes.filter((altIndex) => altIndex !== index),
            );
          } else {
            ingredient.alternatives = unionOfSets(
              ingredient.alternatives,
              new Set(
                alternativesIndexes.filter((altIndex) => altIndex !== index),
              ),
            );
          }
        }
      }
    }

    const id = `ingredient-item-${this._itemCount}`;
    this._itemCount++;

    // Finalize item
    const newItem: IngredientItem = {
      type: "ingredient",
      id,
      alternatives,
    };
    items.push(newItem);

    if (alternatives.length > 1) {
      this.choices.ingredientItems.set(id, { alternatives, active: 0 });
    }
  }

  private _parseIngredientWithGroupKey(
    ingredientMatchString: string,
    items: Step["items"],
  ): void {
    const match = ingredientMatchString.match(ingredientWithGroupKeyRegex);
    if (!match?.groups) return;
    const groups = match.groups;

    // Use variables for readability
    // @|<groupKey|<modifiers><name>{quantity%unit|altQuantities}(preparation)[note]
    const groupKey = groups.ingredientGroupKey!;
    let name = (groups.gmIngredientName || groups.gsIngredientName)!;

    // 1. We build up the different parts of the Ingredient object
    // Preparation
    const preparation = groups.gIngredientPreparation;
    // Flags
    const modifiers = groups.gIngredientModifiers;
    const reference = modifiers !== undefined && modifiers.includes("&");
    const flags: IngredientFlag[] = [];
    if (modifiers !== undefined && modifiers.includes("?")) {
      flags.push("optional");
    }
    if (modifiers !== undefined && modifiers.includes("-")) {
      flags.push("hidden");
    }
    if (
      (modifiers !== undefined && modifiers.includes("@")) ||
      groups.ingredientRecipeAnchor
    ) {
      flags.push("recipe");
    }
    // Extras
    let extras: IngredientExtras | undefined = undefined;
    // -- if the ingredient is a recipe, we need to extract the name from the path given
    if (flags.includes("recipe")) {
      extras = { path: `${name}.cook` };
      name = name.substring(name.lastIndexOf("/") + 1);
    }
    // Distinguish name from display name / name alias
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

    const newIngredient: Ingredient = {
      name: listName,
    };
    // Only add parameters if they are non null / non empty
    if (preparation) {
      newIngredient.preparation = preparation;
    }
    if (flags.length > 0) {
      newIngredient.flags = flags;
    }
    if (extras) {
      newIngredient.extras = extras;
    }

    const idxInList = findAndUpsertIngredient(
      this.ingredients,
      newIngredient,
      reference,
    );

    // 2. We build up the ingredient item
    // -- alternative quantities
    const quantity: IngredientItemQuantity | undefined =
      groups.gIngredientQuantity
        ? {
            equivalents: this._parseQuantityRecursive(
              groups.gIngredientQuantity,
            ),
            scalable: groups.gIngredientQuantityModifier !== "=",
          }
        : undefined;

    const alternative: IngredientAlternative = {
      index: idxInList,
      displayName,
    };
    // Only add quantity and note if they exist
    const note = groups.ingredientNote?.trim();
    if (note) {
      alternative.note = note;
    }
    if (quantity) {
      alternative.quantity = quantity;
    }

    const existingAlternatives = this.choices.ingredientGroups.get(groupKey);
    // For all alternative ingredients already processed for this group, add the new ingredient as alternative
    if (existingAlternatives) {
      for (const alt of existingAlternatives.alternatives) {
        const ingredient = this.ingredients[alt.index];
        if (ingredient) {
          if (ingredient.alternatives === undefined) {
            ingredient.alternatives = new Set([idxInList]);
          } else {
            ingredient.alternatives.add(idxInList);
          }
        }
      }
    }
    const id = `ingredient-item-${this._itemCount}`;
    this._itemCount++;

    // Finalize item
    const newItem: IngredientItem = {
      type: "ingredient",
      id,
      group: groupKey,
      alternatives: [alternative],
    };
    items.push(newItem);

    // Populate or update choices
    alternative.itemId = id;
    const existingChoice = this.choices.ingredientGroups.get(groupKey);
    if (!existingChoice) {
      this.choices.ingredientGroups.set(groupKey, {
        alternatives: [alternative],
        active: 0,
      });
    } else {
      existingChoice.alternatives.push(alternative);
    }
  }

  calc_ingredient_quantities(): void {
    // Resets quantities
    this.ingredients = this.ingredients.map((ing) => {
      if (ing.quantityTotal) {
        delete ing.quantityTotal;
      }
      return ing;
    });

    const ingredientQuantities = new Map<
      number,
      (QuantityWithExtendedUnit | FlatOrGroup<QuantityWithExtendedUnit>)[]
    >();

    // Looping ingredient items
    for (const section of this.sections) {
      for (const step of section.content.filter(
        (item) => item.type === "step",
      )) {
        for (const item of step.items.filter(
          (item) => item.type === "ingredient",
        )) {
          for (let i = 0; i < item.alternatives.length; i++) {
            const alternative = item.alternatives[i] as IngredientAlternative;
            // Is the ingredient selected (potentially by default)
            const isAlternativeChoiceItem =
              this.choices.ingredientGroups.get(item.id)?.active === i;
            const alternativeChoiceGroup = item.group
              ? this.choices.ingredientItems.get(item.group)
              : undefined;
            const isAlternativeChoiceGroup = alternativeChoiceGroup
              ? alternativeChoiceGroup.alternatives[
                  alternativeChoiceGroup.active
                ]!.itemId === item.id
              : false;
            if (
              alternative.quantity &&
              (item.alternatives.length === 1 ||
                isAlternativeChoiceItem ||
                isAlternativeChoiceGroup)
            ) {
              const equivalents:
                | QuantityWithExtendedUnit
                | FlatOrGroup<QuantityWithExtendedUnit> =
                alternative.quantity.equivalents.length === 1
                  ? alternative.quantity.equivalents[0]!
                  : {
                      type: "or",
                      quantities: alternative.quantity.equivalents,
                    };
              ingredientQuantities.set(alternative.index, [
                ...(ingredientQuantities.get(alternative.index) || []),
                equivalents,
              ]);
            }
          }
        }
      }
    }

    // The main calculation loop
    for (const [index, quantities] of ingredientQuantities) {
      if (!this.ingredients[index])
        throw Error(`Ingredient with index ${index} not found`);
      this.ingredients[index].quantityTotal = addEquivalentsAndSimplify(
        ...quantities,
      );
    }
  }

  /**
   * Parses a recipe from a string.
   * @param content - The recipe content to parse.
   */
  parse(content: string) {
    // Remove noise
    const cleanContent = content
      .replace(metadataRegex, "")
      .replace(commentRegex, "")
      .replace(blockCommentRegex, "")
      .trim()
      .split(/\r\n?|\n/);

    // Metadata
    const { metadata, servings }: MetadataExtract = extractMetadata(content);
    this.metadata = metadata;
    this.servings = servings;

    // Initializing utility variables and property bearers
    let blankLineBefore = true;
    let section: Section = new Section();
    const items: Step["items"] = [];
    let note: Note["note"] = "";
    let inNote = false;

    // We parse content line by line
    for (const line of cleanContent) {
      // A blank line triggers flushing pending stuff
      if (line.trim().length === 0) {
        flushPendingItems(section, items);
        note = flushPendingNote(section, note);
        blankLineBefore = true;
        inNote = false;
        continue;
      }

      // New section
      if (line.startsWith("=")) {
        flushPendingItems(section, items);
        note = flushPendingNote(section, note);

        if (this.sections.length === 0 && section.isBlank()) {
          section.name = line.replace(/^=+|=+$/g, "").trim();
        } else {
          /* v8 ignore else -- @preserve */
          if (!section.isBlank()) {
            this.sections.push(section);
          }
          section = new Section(line.replace(/^=+|=+$/g, "").trim());
        }
        blankLineBefore = true;
        inNote = false;
        continue;
      }

      // New note
      if (blankLineBefore && line.startsWith(">")) {
        flushPendingItems(section, items);
        note = flushPendingNote(section, note);
        note += line.substring(1).trim();
        inNote = true;
        blankLineBefore = false;
        continue;
      }

      // Continue note
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

      // Detecting items
      let cursor = 0;
      for (const match of line.matchAll(tokensRegex)) {
        const idx = match.index;
        /* v8 ignore else -- @preserve */
        if (idx > cursor) {
          items.push({ type: "text", value: line.slice(cursor, idx) });
        }

        const groups = match.groups!;

        // Ingredient items with potential in-line alternatives
        if (groups.mIngredientName || groups.sIngredientName) {
          this._parseIngredientWithAlternativeRecursive(match[0], items);
        }
        // Ingredient items part of a group of alternative ingredients
        else if (groups.gmIngredientName || groups.gsIngredientName) {
          this._parseIngredientWithGroupKey(match[0], items);
        }
        // Cookware items
        else if (groups.mCookwareName || groups.sCookwareName) {
          const name = (groups.mCookwareName || groups.sCookwareName)!;
          const modifiers = groups.cookwareModifiers;
          const quantityRaw = groups.cookwareQuantity;
          const reference = modifiers !== undefined && modifiers.includes("&");
          const flags: CookwareFlag[] = [];
          if (modifiers !== undefined && modifiers.includes("?")) {
            flags.push("optional");
          }
          if (modifiers !== undefined && modifiers.includes("-")) {
            flags.push("hidden");
          }
          const quantity = quantityRaw
            ? parseQuantityInput(quantityRaw)
            : undefined;
          const newCookware: Cookware = {
            name,
          };
          if (quantity) {
            newCookware.quantity = quantity;
          }
          if (flags.length > 0) {
            newCookware.flags = flags;
          }

          // Add cookware in cookware list
          const idxInList = findAndUpsertCookware(
            this.cookware,
            newCookware,
            reference,
          );

          // Adding the item itself in the preparation
          const newItem: CookwareItem = {
            type: "cookware",
            index: idxInList,
          };
          if (quantity) {
            newItem.quantity = quantity;
          }
          items.push(newItem);
        }
        // Then it's necessarily a timer which was matched
        else {
          const durationStr = groups.timerQuantity!.trim();
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

    this.calc_ingredient_quantities();
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

    const factor = Big(newServings).div(originalServings);
    return this.scaleBy(factor);
  }

  /**
   * Scales the recipe by a factor.
   * @param factor - The factor to scale the recipe by. While integers can be passed as-is, it is recommended to pass fractions as
   *   [Big](https://github.com/MikeMcl/big.js/) values, e.g. `Big(num).div(den)` in order to avoid undesirable floating point operation inaccuracies.
   * @returns A new Recipe instance with the scaled ingredients.
   */
  scaleBy(factor: number | Big): Recipe {
    const newRecipe = this.clone();

    const originalServings = newRecipe.getServings();

    if (originalServings === undefined || originalServings === 0) {
      throw new Error("Error scaling recipe: no initial servings value set");
    }

    function scaleAlternativesBy(
      alternatives: IngredientAlternative[],
      factor: number | Big,
    ) {
      for (const alternative of alternatives) {
        if (alternative.quantity) {
          alternative.quantity.equivalents =
            alternative.quantity.equivalents.map((altQuantity) => {
              if (
                altQuantity.quantity.type === "fixed" &&
                altQuantity.quantity.value.type === "text"
              ) {
                return altQuantity;
              } else {
                return {
                  ...altQuantity,
                  quantity: multiplyQuantityValue(
                    altQuantity.quantity,
                    alternative.quantity!.scalable ? Big(factor) : 1,
                  ),
                };
              }
            });
        }
      }
    }

    // Scale IngredientItems
    for (const section of newRecipe.sections) {
      for (const step of section.content.filter(
        (item) => item.type === "step",
      )) {
        for (const item of step.items.filter(
          (item) => item.type === "ingredient",
        )) {
          scaleAlternativesBy(item.alternatives, factor);
        }
      }
    }

    // Scale Choices
    for (const choice of newRecipe.choices.ingredientGroups.values()) {
      scaleAlternativesBy(choice.alternatives, factor);
    }
    for (const choice of newRecipe.choices.ingredientItems.values()) {
      scaleAlternativesBy(choice.alternatives, factor);
    }

    newRecipe.calc_ingredient_quantities();

    newRecipe.servings = Big(originalServings).times(factor).toNumber();

    /* v8 ignore else -- @preserve */
    if (newRecipe.metadata.servings && this.metadata.servings) {
      if (
        floatRegex.test(String(this.metadata.servings).replace(",", ".").trim())
      ) {
        const servingsValue = parseFloat(
          String(this.metadata.servings).replace(",", "."),
        );
        newRecipe.metadata.servings = String(
          Big(servingsValue).times(factor).toNumber(),
        );
      }
    }

    /* v8 ignore else -- @preserve */
    if (newRecipe.metadata.yield && this.metadata.yield) {
      if (
        floatRegex.test(String(this.metadata.yield).replace(",", ".").trim())
      ) {
        const yieldValue = parseFloat(
          String(this.metadata.yield).replace(",", "."),
        );
        newRecipe.metadata.yield = String(
          Big(yieldValue).times(factor).toNumber(),
        );
      }
    }

    /* v8 ignore else -- @preserve */
    if (newRecipe.metadata.serves && this.metadata.serves) {
      if (
        floatRegex.test(String(this.metadata.serves).replace(",", ".").trim())
      ) {
        const servesValue = parseFloat(
          String(this.metadata.serves).replace(",", "."),
        );
        newRecipe.metadata.serves = String(
          Big(servesValue).times(factor).toNumber(),
        );
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
    newRecipe._itemCount = this._itemCount;
    // deep copy
    newRecipe.metadata = JSON.parse(JSON.stringify(this.metadata)) as Metadata;
    newRecipe.ingredients = JSON.parse(
      JSON.stringify(this.ingredients),
    ) as Ingredient[];
    newRecipe.sections = this.sections.map((section) => {
      const newSection = new Section(section.name);
      newSection.content = JSON.parse(
        JSON.stringify(section.content),
      ) as Section["content"];
      return newSection;
    });
    newRecipe.cookware = JSON.parse(
      JSON.stringify(this.cookware),
    ) as Cookware[];
    newRecipe.timers = JSON.parse(JSON.stringify(this.timers)) as Timer[];
    newRecipe.servings = this.servings;
    return newRecipe;
  }
}
