import type {
  Metadata,
  Ingredient,
  IngredientExtras,
  IngredientItem,
  IngredientItemQuantity,
  Timer,
  Step,
  NoteItem,
  Cookware,
  MetadataExtract,
  CookwareItem,
  IngredientFlag,
  CookwareFlag,
  RecipeAlternatives,
  IngredientAlternative,
  FlatOrGroup,
  QuantityWithExtendedUnit,
  AlternativeIngredientRef,
  QuantityWithPlainUnit,
  IngredientQuantityGroup,
  IngredientQuantityAndGroup,
  ArbitraryScalable,
  FixedNumericValue,
  StepItem,
  GetIngredientQuantitiesOptions,
  SpecificUnitSystem,
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
  inlineIngredientAlternativesRegex,
  arbitraryScalableRegex,
} from "../regex";
import {
  flushPendingItems,
  flushPendingNote,
  findAndUpsertIngredient,
  findAndUpsertCookware,
  parseQuantityInput,
  extractMetadata,
  unionOfSets,
  getAlternativeSignature,
} from "../utils/parser_helpers";
import { addEquivalentsAndSimplify } from "../quantities/alternatives";
import { multiplyQuantityValue } from "../quantities/numeric";
import {
  toPlainUnit,
  toExtendedUnit,
  flattenPlainUnitGroup,
  applyBestUnit,
} from "../quantities/mutations";
import { resolveUnit } from "../units/definitions";
import Big from "big.js";
import { deepClone } from "../utils/general";
import { InvalidQuantityFormat } from "../errors";

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
   * The possible choices of alternative ingredients for this recipe.
   */
  choices: RecipeAlternatives = {
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
   * The parsed arbitrary quantities.
   */
  arbitraries: ArbitraryScalable[] = [];
  /**
   * The parsed recipe servings. Used for scaling. Parsed from one of
   * {@link Metadata.servings}, {@link Metadata.yield} or {@link Metadata.serves}
   * metadata fields.
   *
   * @see {@link Recipe.scaleBy | scaleBy()} and {@link Recipe.scaleTo | scaleTo()} methods
   */
  servings?: number;

  /**
   * Gets the unit system specified in the recipe metadata.
   * Used for resolving ambiguous units like tsp, tbsp, cup, etc.
   *
   * @returns The unit system if specified, or undefined to use defaults
   */
  get unitSystem(): SpecificUnitSystem | undefined {
    return Recipe.unitSystems.get(this);
  }

  /**
   * External storage for unit system (not a property on instances).
   * Used for resolving ambiguous units during quantity addition.
   */
  private static unitSystems = new WeakMap<Recipe, SpecificUnitSystem>();

  /**
   * External storage for item count (not a property on instances).
   * Used for giving ID numbers to items during parsing.
   */
  private static itemCounts = new WeakMap<Recipe, number>();

  /**
   * Gets the current item count for this recipe.
   */
  private getItemCount(): number {
    return Recipe.itemCounts.get(this)!;
  }

  /**
   * Gets the current item count and increments it.
   */
  private getAndIncrementItemCount(): number {
    const current = this.getItemCount();
    Recipe.itemCounts.set(this, current + 1);
    return current;
  }

  /**
   * Creates a new Recipe instance.
   * @param content - The recipe content to parse.
   */
  constructor(content?: string) {
    Recipe.itemCounts.set(this, 0);
    if (content) {
      this.parse(content);
    }
  }

  /**
   * Parses a matched arbitrary scalable quantity and adds it to the given array.
   * @private
   * @param regexMatchGroups - The regex match groups from arbitrary scalable regex.
   * @param intoArray - The array to push the parsed arbitrary scalable item into.
   */
  private _parseArbitraryScalable(
    regexMatchGroups: RegExpMatchArray["groups"],
    intoArray: Array<NoteItem | StepItem>,
  ): void {
    // Type-guard to ensure regexMatchGroups is defined, which it is when calling this function
    // v8 ignore if -- @preserve
    if (!regexMatchGroups || !regexMatchGroups.arbitraryQuantity) return;
    const quantityMatch = regexMatchGroups.arbitraryQuantity
      ?.trim()
      .match(quantityAlternativeRegex);
    // Type-guard to ensure quantityMatch.groups is defined, which we know when calling this function
    // v8 ignore else -- @preserve
    if (quantityMatch?.groups) {
      const value = parseQuantityInput(quantityMatch.groups.quantity!);
      const unit = quantityMatch.groups.unit;
      const name = regexMatchGroups.arbitraryName || undefined;
      if (!value || (value.type === "fixed" && value.value.type === "text")) {
        throw new InvalidQuantityFormat(
          regexMatchGroups.arbitraryQuantity?.trim(),
          "Arbitrary quantities must have a numerical value",
        );
      }
      const arbitrary: ArbitraryScalable = {
        quantity: value as FixedNumericValue,
      };
      if (name) arbitrary.name = name;
      if (unit) arbitrary.unit = unit;
      intoArray.push({
        type: "arbitrary",
        index: this.arbitraries.push(arbitrary) - 1,
      });
    }
  }

  /**
   * Parses text for arbitrary scalables and returns NoteItem array.
   * @param text - The text to parse for arbitrary scalables.
   * @returns Array of NoteItem (text and arbitrary scalable items).
   */
  private _parseNoteText(text: string): NoteItem[] {
    const noteItems: NoteItem[] = [];
    let cursor = 0;
    const globalRegex = new RegExp(arbitraryScalableRegex.source, "g");

    for (const match of text.matchAll(globalRegex)) {
      const idx = match.index;
      /* v8 ignore else -- @preserve */
      if (idx > cursor) {
        noteItems.push({ type: "text", value: text.slice(cursor, idx) });
      }

      this._parseArbitraryScalable(match.groups, noteItems);
      cursor = idx + match[0].length;
    }

    if (cursor < text.length) {
      noteItems.push({ type: "text", value: text.slice(cursor) });
    }

    return noteItems;
  }

  private _parseQuantityRecursive(
    quantityRaw: string,
  ): QuantityWithExtendedUnit[] {
    let quantityMatch = quantityRaw.match(quantityAlternativeRegex);
    const quantities: QuantityWithExtendedUnit[] = [];
    while (quantityMatch?.groups) {
      const value = quantityMatch.groups.quantity
        ? parseQuantityInput(quantityMatch.groups.quantity)
        : undefined;
      const unit = quantityMatch.groups.unit;
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
        throw new InvalidQuantityFormat(quantityRaw);
      }
      quantityMatch = quantityMatch.groups.alternative
        ? quantityMatch.groups.alternative.match(quantityAlternativeRegex)
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
      const match = testString.match(
        alternatives.length > 0
          ? inlineIngredientAlternativesRegex
          : ingredientWithAlternativeRegex,
      );
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
      let itemQuantity: IngredientItemQuantity | undefined = undefined;
      if (groups.ingredientQuantity) {
        const parsedQuantities = this._parseQuantityRecursive(
          groups.ingredientQuantity,
        );
        const [primary, ...rest] = parsedQuantities;
        if (primary) {
          itemQuantity = {
            ...primary,
            scalable: groups.ingredientQuantityModifier !== "=",
          };
          if (rest.length > 0) {
            itemQuantity.equivalents = rest;
          }
        }
      }

      const alternative: IngredientAlternative = {
        index: idxInList,
        displayName,
      };
      // Only add itemQuantity and note if they exist
      const note = groups.ingredientNote?.trim();
      if (note) {
        alternative.note = note;
      }
      if (itemQuantity) {
        alternative.itemQuantity = itemQuantity;
      }
      alternatives.push(alternative);
      testString = groups.ingredientAlternative || "";
    }

    // Update alternatives list of all processed ingredients
    if (alternatives.length > 1) {
      const alternativesIndexes = alternatives.map((alt) => alt.index);
      for (const ingredientIndex of alternativesIndexes) {
        const ingredient = this.ingredients[ingredientIndex];
        // In practice, the ingredient will always be found
        /* v8 ignore else -- @preserve */
        if (ingredient) {
          if (!ingredient.alternatives) {
            ingredient.alternatives = new Set(
              alternativesIndexes.filter((index) => index !== ingredientIndex),
            );
          } else {
            ingredient.alternatives = unionOfSets(
              ingredient.alternatives,
              new Set(
                alternativesIndexes.filter(
                  (index) => index !== ingredientIndex,
                ),
              ),
            );
          }
        }
      }
    }

    const id = `ingredient-item-${this.getAndIncrementItemCount()}`;

    // Finalize item
    const newItem: IngredientItem = {
      type: "ingredient",
      id,
      alternatives,
    };
    items.push(newItem);

    if (alternatives.length > 1) {
      this.choices.ingredientItems.set(id, alternatives);
    }
  }

  private _parseIngredientWithGroupKey(
    ingredientMatchString: string,
    items: Step["items"],
  ): void {
    const match = ingredientMatchString.match(ingredientWithGroupKeyRegex);
    // This is a type guard to ensure match and match.groups are defined
    /* v8 ignore if -- @preserve */
    if (!match?.groups) return;
    const groups = match.groups;

    // Use variables for readability
    // @|<groupKey|<modifiers><name>{quantity%unit|altQuantities}(preparation)[note]
    const groupKey = groups.gIngredientGroupKey!;
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
      groups.gIngredientRecipeAnchor
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
    let itemQuantity: IngredientItemQuantity | undefined = undefined;
    if (groups.gIngredientQuantity) {
      const parsedQuantities = this._parseQuantityRecursive(
        groups.gIngredientQuantity,
      );
      const [primary, ...rest] = parsedQuantities;
      itemQuantity = {
        ...primary!, // there's necessarily a primary quantity as the match group was detected
        scalable: groups.gIngredientQuantityModifier !== "=",
      };
      if (rest.length > 0) {
        itemQuantity.equivalents = rest;
      }
    }

    const alternative: IngredientAlternative = {
      index: idxInList,
      displayName,
    };
    // Only add itemQuantity if it exists
    if (itemQuantity) {
      alternative.itemQuantity = itemQuantity;
    }

    const existingAlternatives = this.choices.ingredientGroups.get(groupKey);
    // For all alternative ingredients already processed for this group, add the new ingredient as alternative
    function upsertAlternativeToIngredient(
      ingredients: Ingredient[],
      ingredientIdx: number,
      newAlternativeIdx: number,
    ) {
      const ingredient = ingredients[ingredientIdx];
      // In practice, the ingredient will always be found
      /* v8 ignore else -- @preserve */
      if (ingredient) {
        if (ingredient.alternatives === undefined) {
          ingredient.alternatives = new Set([newAlternativeIdx]);
        } else {
          ingredient.alternatives.add(newAlternativeIdx);
        }
      }
    }
    if (existingAlternatives) {
      for (const alt of existingAlternatives) {
        upsertAlternativeToIngredient(this.ingredients, alt.index, idxInList);
        upsertAlternativeToIngredient(this.ingredients, idxInList, alt.index);
      }
    }
    const id = `ingredient-item-${this.getAndIncrementItemCount()}`;

    // Finalize item
    const newItem: IngredientItem = {
      type: "ingredient",
      id,
      group: groupKey,
      alternatives: [alternative],
    };
    items.push(newItem);

    // Populate or update choices
    const choiceAlternative = deepClone(alternative);
    choiceAlternative.itemId = id;
    const existingChoice = this.choices.ingredientGroups.get(groupKey);
    if (!existingChoice) {
      this.choices.ingredientGroups.set(groupKey, [choiceAlternative]);
    } else {
      existingChoice.push(choiceAlternative);
    }
  }

  /**
   * Populates the `quantities` property for each ingredient based on
   * how they appear in the recipe preparation. Only primary ingredients
   * get quantities populated. Primary ingredients get `usedAsPrimary: true` flag.
   *
   * For inline alternatives (e.g. `\@a|b|c`), the first alternative is primary.
   * For grouped alternatives (e.g. `\@|group|a`, `\@|group|b`), the first item in the group is primary.
   *
   * Quantities are grouped by their alternative signature and summed using addEquivalentsAndSimplify.
   * @internal
   */
  private _populate_ingredient_quantities(): void {
    // Reset quantities and usedAsPrimary flag
    for (const ing of this.ingredients) {
      delete ing.quantities;
      delete ing.usedAsPrimary;
    }

    // Get ingredients with quantities using default (no explicit choice = primary with alternatives)
    const ingredientsWithQuantities = this.getIngredientQuantities();

    // Track which indices have been matched (for handling duplicate names)
    const matchedIndices = new Set<number>();

    // Copy quantities and usedAsPrimary to this.ingredients
    // Match by finding the first ingredient with same name that hasn't been matched yet
    for (const computed of ingredientsWithQuantities) {
      const idx = this.ingredients.findIndex(
        (ing, i) => ing.name === computed.name && !matchedIndices.has(i),
      );
      matchedIndices.add(idx);
      const ing = this.ingredients[idx]!;
      if (computed.quantities) {
        ing.quantities = computed.quantities;
      }
      if (computed.usedAsPrimary) {
        ing.usedAsPrimary = true;
      }
    }
  }

  /**
   * Gets ingredients with their quantities populated, optionally filtered by section/step
   * and respecting user choices for alternatives.
   *
   * When no options are provided, returns all recipe ingredients with quantities
   * calculated using primary alternatives (same as after parsing).
   *
   * @param options - Options for filtering and choice selection:
   *   - `section`: Filter to a specific section (Section object or 0-based index)
   *   - `step`: Filter to a specific step (Step object or 0-based index)
   *   - `choices`: Choices for alternative ingredients (defaults to primary)
   * @returns Array of Ingredient objects with quantities populated
   *
   * @example
   * ```typescript
   * // Get all ingredients with primary alternatives
   * const ingredients = recipe.getIngredientQuantities();
   *
   * // Get ingredients for a specific section
   * const sectionIngredients = recipe.getIngredientQuantities({ section: 0 });
   *
   * // Get ingredients with specific choices applied
   * const withChoices = recipe.getIngredientQuantities({
   *   choices: { ingredientItems: new Map([['ingredient-item-2', 1]]) }
   * });
   * ```
   */
  getIngredientQuantities(
    options?: GetIngredientQuantitiesOptions,
  ): Ingredient[] {
    const { section, step, choices } = options || {};

    // Determine sections to process
    const sectionsToProcess =
      section !== undefined
        ? (() => {
            const idx =
              typeof section === "number"
                ? section
                : this.sections.indexOf(section);
            return idx >= 0 && idx < this.sections.length
              ? [this.sections[idx]!]
              : [];
          })()
        : this.sections;

    // Type for accumulated quantities
    type QuantityAccumulator = {
      quantities: (
        | QuantityWithExtendedUnit
        | FlatOrGroup<QuantityWithExtendedUnit>
      )[];
      alternativeQuantities: Map<
        number,
        (QuantityWithExtendedUnit | FlatOrGroup<QuantityWithExtendedUnit>)[]
      >;
    };

    // Map: ingredientIndex -> alternativeSignature -> accumulated data
    const ingredientGroups = new Map<
      number,
      Map<string | null, QuantityAccumulator>
    >();

    // Track selected ingredients (get quantities + usedAsPrimary) and all referenced ingredients
    const selectedIndices = new Set<number>();
    const referencedIndices = new Set<number>();

    for (const currentSection of sectionsToProcess) {
      const allSteps = currentSection.content.filter(
        (item): item is Step => item.type === "step",
      );

      // Determine steps to process
      const stepsToProcess =
        step === undefined
          ? allSteps
          : typeof step === "number"
            ? step >= 0 && step < allSteps.length
              ? [allSteps[step]!]
              : []
            : allSteps.includes(step)
              ? [step]
              : [];

      for (const currentStep of stepsToProcess) {
        for (const item of currentStep.items.filter(
          (item): item is IngredientItem => item.type === "ingredient",
        )) {
          const isGrouped = "group" in item && item.group !== undefined;
          const groupAlternatives = isGrouped
            ? this.choices.ingredientGroups.get(item.group!)
            : undefined;

          // Determine selection state
          let selectedAltIndex = 0;
          let isSelected = false;
          let hasExplicitChoice = false;

          if (isGrouped) {
            const groupChoice = choices?.ingredientGroups?.get(item.group!);
            hasExplicitChoice = groupChoice !== undefined;
            const targetIndex = groupChoice ?? 0;
            isSelected = groupAlternatives?.[targetIndex]?.itemId === item.id;
          } else {
            const itemChoice = choices?.ingredientItems?.get(item.id);
            hasExplicitChoice = itemChoice !== undefined;
            selectedAltIndex = itemChoice ?? 0;
            isSelected = true;
          }

          const alternative = item.alternatives[selectedAltIndex];
          if (!alternative || !isSelected) continue;

          selectedIndices.add(alternative.index);

          // Add all alternatives to referenced set (so indices remain valid in result)
          const allAlts = isGrouped ? groupAlternatives! : item.alternatives;
          for (const alt of allAlts) {
            referencedIndices.add(alt.index);
          }

          if (!alternative.itemQuantity) continue;

          // Build quantity entry with equivalents
          const baseQty: QuantityWithExtendedUnit = {
            quantity: alternative.itemQuantity.quantity,
            ...(alternative.itemQuantity.unit && {
              unit: alternative.itemQuantity.unit,
            }),
          };
          const quantityEntry = alternative.itemQuantity.equivalents?.length
            ? { or: [baseQty, ...alternative.itemQuantity.equivalents] }
            : baseQty;

          // Build alternative refs (only when no explicit choice)
          let alternativeRefs: AlternativeIngredientRef[] | undefined;
          if (!hasExplicitChoice && allAlts.length > 1) {
            alternativeRefs = allAlts
              .filter((alt) =>
                isGrouped
                  ? alt.itemId !== item.id
                  : alt.index !== alternative.index,
              )
              .map((otherAlt) => {
                const ref: AlternativeIngredientRef = { index: otherAlt.index };
                if (otherAlt.itemQuantity) {
                  const altQty: QuantityWithPlainUnit = {
                    quantity: otherAlt.itemQuantity.quantity,
                    ...(otherAlt.itemQuantity.unit && {
                      unit: otherAlt.itemQuantity.unit.name,
                    }),
                    ...(otherAlt.itemQuantity.equivalents && {
                      equivalents: otherAlt.itemQuantity.equivalents.map(
                        (eq) => toPlainUnit(eq) as QuantityWithPlainUnit,
                      ),
                    }),
                  };
                  ref.quantities = [altQty];
                }
                return ref;
              });
          }

          // Get or create accumulator for this ingredient/signature
          // Use unit type+system for signature only when there are alternatives,
          // so compatible units (g/kg) group together but incompatible (cup/g) stay separate
          const altIndices = getAlternativeSignature(alternativeRefs) ?? "";
          let signature: string | null;
          if (isGrouped) {
            const resolvedUnit = resolveUnit(
              alternative.itemQuantity.unit?.name,
            );
            signature = `group:${item.group}|${altIndices}|${resolvedUnit.type}`;
          } else if (altIndices) {
            // Has alternatives: include unit type to keep incompatible units separate
            const resolvedUnit = resolveUnit(
              alternative.itemQuantity.unit?.name,
            );
            signature = `${altIndices}|${resolvedUnit.type}}`;
          } else {
            // No alternatives: use null to allow normal summing behavior
            signature = null;
          }

          if (!ingredientGroups.has(alternative.index)) {
            ingredientGroups.set(alternative.index, new Map());
          }
          const groupsForIng = ingredientGroups.get(alternative.index)!;
          if (!groupsForIng.has(signature)) {
            groupsForIng.set(signature, {
              quantities: [],
              alternativeQuantities: new Map(),
            });
          }
          const group = groupsForIng.get(signature)!;

          group.quantities.push(quantityEntry);

          // Accumulate alternative quantities
          for (const ref of alternativeRefs ?? []) {
            if (!group.alternativeQuantities.has(ref.index)) {
              group.alternativeQuantities.set(ref.index, []);
            }
            for (const altQty of ref.quantities ?? []) {
              const extended = toExtendedUnit({
                quantity: altQty.quantity,
                unit: altQty.unit,
              });
              if (altQty.equivalents?.length) {
                const eqEntries: QuantityWithExtendedUnit[] = [
                  extended,
                  ...altQty.equivalents.map((eq) => toExtendedUnit(eq)),
                ];
                group.alternativeQuantities
                  .get(ref.index)!
                  .push({ or: eqEntries });
              } else {
                group.alternativeQuantities.get(ref.index)!.push(extended);
              }
            }
          }
        }
      }
    }

    // Build result
    const result: Ingredient[] = [];

    for (let index = 0; index < this.ingredients.length; index++) {
      if (!referencedIndices.has(index)) continue;

      const orig = this.ingredients[index]!;
      const ing: Ingredient = {
        name: orig.name,
        ...(orig.preparation && { preparation: orig.preparation }),
        ...(orig.flags && { flags: orig.flags }),
        ...(orig.extras && { extras: orig.extras }),
      };

      if (selectedIndices.has(index)) {
        ing.usedAsPrimary = true;

        const groupsForIng = ingredientGroups.get(index);
        if (groupsForIng) {
          const quantityGroups: (
            | IngredientQuantityGroup
            | IngredientQuantityAndGroup
          )[] = [];

          for (const [, group] of groupsForIng) {
            const summed = addEquivalentsAndSimplify(
              group.quantities,
              this.unitSystem,
            );
            const flattened = flattenPlainUnitGroup(summed);

            // Build alternatives from accumulated quantities
            const alternatives: AlternativeIngredientRef[] | undefined =
              group.alternativeQuantities.size > 0
                ? [...group.alternativeQuantities].map(([altIdx, altQtys]) => ({
                    index: altIdx,
                    ...(altQtys.length > 0 && {
                      quantities: flattenPlainUnitGroup(
                        addEquivalentsAndSimplify(altQtys, this.unitSystem),
                      ).flatMap(
                        /* v8 ignore next -- item.and branch requires complex nested AND-with-equivalents structure */
                        (item) => ("quantity" in item ? [item] : item.and),
                      ),
                    }),
                  }))
                : undefined;

            for (const gq of flattened) {
              if ("and" in gq) {
                quantityGroups.push({
                  and: gq.and,
                  ...(gq.equivalents?.length && {
                    equivalents: gq.equivalents,
                  }),
                  ...(alternatives?.length && { alternatives }),
                });
              } else {
                quantityGroups.push({
                  ...(gq as IngredientQuantityGroup),
                  ...(alternatives?.length && { alternatives }),
                });
              }
            }
          }

          // v8 ignore else -- @preserve
          if (quantityGroups.length > 0) {
            ing.quantities = quantityGroups;
          }
        }
      }

      result.push(ing);
    }

    return result;
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
    const { metadata, servings, unitSystem }: MetadataExtract =
      extractMetadata(content);
    this.metadata = metadata;
    this.servings = servings;
    if (unitSystem) Recipe.unitSystems.set(this, unitSystem);

    // Initializing utility variables and property bearers
    let blankLineBefore = true;
    let section: Section = new Section();
    const items: Step["items"] = [];
    let noteText = "";
    let inNote = false;

    // We parse content line by line
    for (const line of cleanContent) {
      // A blank line triggers flushing pending stuff
      if (line.trim().length === 0) {
        flushPendingItems(section, items);
        flushPendingNote(
          section,
          noteText ? this._parseNoteText(noteText) : [],
        );
        noteText = "";
        blankLineBefore = true;
        inNote = false;
        continue;
      }

      // New section
      if (line.startsWith("=")) {
        flushPendingItems(section, items);
        flushPendingNote(
          section,
          noteText ? this._parseNoteText(noteText) : [],
        );
        noteText = "";

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
        noteText = line.substring(1).trim();
        inNote = true;
        blankLineBefore = false;
        continue;
      }

      // Continue note
      if (inNote) {
        if (line.startsWith(">")) {
          noteText += " " + line.substring(1).trim();
        } else {
          noteText += " " + line.trim();
        }
        blankLineBefore = false;
        continue;
      }

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
        // Arbitrary scalable quantities
        else if (groups.arbitraryQuantity) {
          this._parseArbitraryScalable(groups, items);
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
    flushPendingNote(section, noteText ? this._parseNoteText(noteText) : []);
    if (!section.isBlank()) {
      this.sections.push(section);
    }

    this._populate_ingredient_quantities();
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
    let originalServings = this.getServings();

    // Default to 1 if no servings defined
    if (originalServings === undefined || originalServings === 0) {
      originalServings = 1;
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

    let originalServings = newRecipe.getServings();

    // Default to 1 if no servings defined
    if (originalServings === undefined || originalServings === 0) {
      originalServings = 1;
    }

    // Get unit system for best unit optimization (if set)
    const unitSystem = this.unitSystem;

    function scaleAlternativesBy(
      alternatives: IngredientAlternative[],
      factor: number | Big,
    ) {
      for (const alternative of alternatives) {
        if (alternative.itemQuantity) {
          const scaleFactor = alternative.itemQuantity.scalable
            ? Big(factor)
            : 1;
          // Scale the primary quantity
          if (
            alternative.itemQuantity.quantity.type !== "fixed" ||
            alternative.itemQuantity.quantity.value.type !== "text"
          ) {
            alternative.itemQuantity.quantity = multiplyQuantityValue(
              alternative.itemQuantity.quantity,
              scaleFactor,
            );
          }
          // Scale equivalents if any
          if (alternative.itemQuantity.equivalents) {
            alternative.itemQuantity.equivalents =
              alternative.itemQuantity.equivalents.map(
                (altQuantity: QuantityWithExtendedUnit) => {
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
                        scaleFactor,
                      ),
                    };
                  }
                },
              );
          }

          // Apply best unit optimization (infers system from unit if unitSystem not set)
          // Apply to primary
          const optimizedPrimary = applyBestUnit(
            {
              quantity: alternative.itemQuantity.quantity,
              unit: alternative.itemQuantity.unit,
            },
            unitSystem,
          );
          alternative.itemQuantity.quantity = optimizedPrimary.quantity;
          alternative.itemQuantity.unit = optimizedPrimary.unit;

          // Apply to equivalents
          if (alternative.itemQuantity.equivalents) {
            alternative.itemQuantity.equivalents =
              alternative.itemQuantity.equivalents.map((eq) =>
                applyBestUnit(eq, unitSystem),
              );
          }
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
    for (const alternatives of newRecipe.choices.ingredientGroups.values()) {
      scaleAlternativesBy(alternatives, factor);
    }
    for (const alternatives of newRecipe.choices.ingredientItems.values()) {
      scaleAlternativesBy(alternatives, factor);
    }

    // Scale Arbitraries
    for (const arbitrary of newRecipe.arbitraries) {
      arbitrary.quantity = multiplyQuantityValue(
        arbitrary.quantity,
        factor,
      ) as FixedNumericValue;
    }

    newRecipe._populate_ingredient_quantities();

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
    newRecipe.choices = deepClone(this.choices);
    Recipe.itemCounts.set(newRecipe, this.getItemCount());
    // deep copy
    newRecipe.metadata = deepClone(this.metadata);
    newRecipe.ingredients = deepClone(this.ingredients);
    newRecipe.sections = this.sections.map((section) => {
      const newSection = new Section(section.name);
      newSection.content = deepClone(section.content);
      return newSection;
    });
    newRecipe.cookware = deepClone(this.cookware);
    newRecipe.timers = deepClone(this.timers);
    newRecipe.arbitraries = deepClone(this.arbitraries);
    newRecipe.servings = this.servings;
    return newRecipe;
  }
}
