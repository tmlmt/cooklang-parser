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
  RecipeAlternatives,
  IngredientAlternative,
  FlatOrGroup,
  QuantityWithExtendedUnit,
  ComputedIngredient,
  AlternativeIngredientRef,
  QuantityWithPlainUnit,
  IngredientQuantityGroup,
  IngredientQuantityAndGroup,
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
} from "../quantities/mutations";
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
   * The default or manual choice of alternative ingredients.
   * Contains the full context including alternatives list and active selection index.
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
   * The parsed recipe servings. Used for scaling. Parsed from one of
   * {@link Metadata.servings}, {@link Metadata.yield} or {@link Metadata.serves}
   * metadata fields.
   *
   * @see {@link Recipe.scaleBy | scaleBy()} and {@link Recipe.scaleTo | scaleTo()} methods
   */
  servings?: number;

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
        throw new InvalidQuantityFormat(quantityRaw);
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
    this.ingredients = this.ingredients.map((ing) => {
      if (ing.quantities) {
        delete ing.quantities;
      }
      if (ing.usedAsPrimary) {
        delete ing.usedAsPrimary;
      }
      return ing;
    });

    // Track which groups we've already seen (to identify first item in each group)
    const seenGroups = new Set<string>();

    // Type for accumulated alternative quantities (using extended units for summing)
    type AlternativeQuantitiesMap = Map<
      number,
      (QuantityWithExtendedUnit | FlatOrGroup<QuantityWithExtendedUnit>)[]
    >;

    // Nested map: ingredientIndex -> alternativeSignature -> { alternativeQuantities, quantities }
    // This groups quantities by their alternative signature for proper summing
    const ingredientGroups = new Map<
      number,
      Map<
        string | null,
        {
          alternativeQuantities: AlternativeQuantitiesMap;
          quantities: (
            | QuantityWithExtendedUnit
            | FlatOrGroup<QuantityWithExtendedUnit>
          )[];
        }
      >
    >();

    // Loop through all ingredient items in all sections
    for (const section of this.sections) {
      for (const step of section.content.filter(
        (item) => item.type === "step",
      )) {
        for (const item of step.items.filter(
          (item) => item.type === "ingredient",
        )) {
          // For grouped alternatives, only the first item in the group is primary
          const isGroupedItem = "group" in item && item.group !== undefined;
          const isFirstInGroup = isGroupedItem && !seenGroups.has(item.group!);
          if (isGroupedItem) {
            seenGroups.add(item.group!);
          }

          // Determine if this item's first alternative is a primary ingredient
          // - For non-grouped items: always primary (index 0)
          // - For grouped items: only primary if first in the group
          const isPrimary = !isGroupedItem || isFirstInGroup;

          // Only process the first alternative (primary ingredient) for quantities
          const alternative = item.alternatives[0] as IngredientAlternative;

          // Mark this ingredient as used as primary if applicable
          if (isPrimary) {
            const primaryIngredient = this.ingredients[alternative.index];
            /* v8 ignore else -- @preserve */
            if (primaryIngredient) {
              primaryIngredient.usedAsPrimary = true;
            }
          }

          // Only populate quantities for primary ingredients
          if (!isPrimary || !alternative.itemQuantity) continue;

          // Build the primary quantity with equivalents as an OrGroup (like calc_ingredient_quantities)
          const allQuantities: QuantityWithExtendedUnit[] = [
            {
              quantity: alternative.itemQuantity.quantity,
              unit: alternative.itemQuantity.unit,
            },
          ];
          if (alternative.itemQuantity.equivalents) {
            allQuantities.push(...alternative.itemQuantity.equivalents);
          }

          const quantityEntry:
            | QuantityWithExtendedUnit
            | FlatOrGroup<QuantityWithExtendedUnit> =
            allQuantities.length === 1
              ? allQuantities[0]!
              : { type: "or", entries: allQuantities };

          // Check if this ingredient item has alternatives (inline or grouped)
          const hasInlineAlternatives = item.alternatives.length > 1;
          const hasGroupedAlternatives =
            isGroupedItem && this.choices.ingredientGroups.has(item.group!);

          let alternativeRefs: AlternativeIngredientRef[] | undefined;

          if (hasInlineAlternatives) {
            // Build alternative refs for inline alternatives (e.g. @milk|almond milk|soy milk)
            alternativeRefs = [];
            for (let j = 1; j < item.alternatives.length; j++) {
              const otherAlt = item.alternatives[j] as IngredientAlternative;
              const newRef: AlternativeIngredientRef = {
                index: otherAlt.index,
              };
              if (otherAlt.itemQuantity) {
                // Build the alternative quantities with plain units
                const altQty: QuantityWithPlainUnit = {
                  quantity: otherAlt.itemQuantity.quantity,
                };
                /* v8 ignore else -- @preserve */
                if (otherAlt.itemQuantity.unit) {
                  altQty.unit = otherAlt.itemQuantity.unit.name;
                }
                if (otherAlt.itemQuantity.equivalents) {
                  altQty.equivalents = otherAlt.itemQuantity.equivalents.map(
                    (eq) => toPlainUnit(eq) as QuantityWithPlainUnit,
                  );
                }
                newRef.quantities = [altQty];
              }
              alternativeRefs.push(newRef);
            }
          } else if (hasGroupedAlternatives) {
            // Build alternative refs for grouped alternatives (e.g. @|group|milk, @|group|almond milk)
            const groupAlternatives = this.choices.ingredientGroups.get(
              item.group!,
            )!;
            // Skip the first one (that's the primary, which is this ingredient)
            alternativeRefs = [];
            for (let j = 1; j < groupAlternatives.length; j++) {
              const otherAlt = groupAlternatives[j] as IngredientAlternative;
              /* v8 ignore else -- @preserve */
              if (otherAlt.itemQuantity) {
                // Build the alternative quantities with plain units
                const altQty: QuantityWithPlainUnit = {
                  quantity: otherAlt.itemQuantity.quantity,
                };
                if (otherAlt.itemQuantity.unit) {
                  altQty.unit = otherAlt.itemQuantity.unit.name;
                }
                if (otherAlt.itemQuantity.equivalents) {
                  altQty.equivalents = otherAlt.itemQuantity.equivalents.map(
                    (eq) => toPlainUnit(eq) as QuantityWithPlainUnit,
                  );
                }
                alternativeRefs.push({
                  index: otherAlt.index,
                  quantities: [altQty],
                });
              }
            }
            if (alternativeRefs.length === 0) {
              alternativeRefs = undefined;
            }
          }

          // Get or create the map for this ingredient
          if (!ingredientGroups.has(alternative.index)) {
            ingredientGroups.set(alternative.index, new Map());
          }
          const groupsForIngredient = ingredientGroups.get(alternative.index)!;

          // Get the alternative signature for grouping
          // Include the group name to keep quantities from different choice groups separate
          const baseSignature = getAlternativeSignature(alternativeRefs);
          const signature = isGroupedItem
            ? `group:${item.group}|${baseSignature ?? ""}`
            : baseSignature;

          // Get or create the group for this signature
          if (!groupsForIngredient.has(signature)) {
            groupsForIngredient.set(signature, {
              alternativeQuantities: new Map<
                number,
                (
                  | QuantityWithExtendedUnit
                  | FlatOrGroup<QuantityWithExtendedUnit>
                )[]
              >(),
              quantities: [],
            });
          }
          const group = groupsForIngredient.get(signature)!;

          // Add the quantity to the group
          group.quantities.push(quantityEntry);

          // Also accumulate alternative quantities for summing
          if (alternativeRefs) {
            for (const ref of alternativeRefs) {
              // Always track the alternative index, even without quantity
              if (!group.alternativeQuantities.has(ref.index)) {
                group.alternativeQuantities.set(ref.index, []);
              }

              if (ref.quantities && ref.quantities.length > 0) {
                for (const altQty of ref.quantities) {
                  if (altQty.equivalents && altQty.equivalents.length > 0) {
                    const entries: QuantityWithExtendedUnit[] = [
                      toExtendedUnit({
                        quantity: altQty.quantity,
                        unit: altQty.unit,
                      }),
                      ...altQty.equivalents.map((eq) => toExtendedUnit(eq)),
                    ];
                    group.alternativeQuantities
                      .get(ref.index)!
                      .push({ type: "or", entries });
                  } else {
                    group.alternativeQuantities.get(ref.index)!.push(
                      toExtendedUnit({
                        quantity: altQty.quantity,
                        unit: altQty.unit,
                      }),
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    // Process each ingredient's groups and assign summed quantities
    for (const [index, groupsForIngredient] of ingredientGroups) {
      const ingredient = this.ingredients[index]!;

      const quantityGroups: (
        | IngredientQuantityGroup
        | IngredientQuantityAndGroup
      )[] = [];

      for (const [, group] of groupsForIngredient) {
        // Use addEquivalentsAndSimplify to sum all quantities in this group
        const summedGroupQuantity = addEquivalentsAndSimplify(
          ...group.quantities,
        );
        // Convert to proper format (IngredientQuantityGroup or IngredientQuantityAndGroup)
        const groupQuantities = flattenPlainUnitGroup(summedGroupQuantity);

        // Process alternatives - they need to be converted similarly
        let alternatives: AlternativeIngredientRef[] | undefined;
        if (group.alternativeQuantities.size > 0) {
          alternatives = [];
          for (const [altIndex, altQuantities] of group.alternativeQuantities) {
            const ref: AlternativeIngredientRef = { index: altIndex };
            if (altQuantities.length > 0) {
              // Sum the alternative quantities using addEquivalentsAndSimplify
              const summedAltQuantity = addEquivalentsAndSimplify(
                ...altQuantities,
              );
              // Convert to array of QuantityWithPlainUnit
              const flattenedAlt = flattenPlainUnitGroup(summedAltQuantity);
              // Extract quantities from the flattened result
              ref.quantities = flattenedAlt.flatMap((item) => {
                if ("groupQuantity" in item) {
                  return [item.groupQuantity];
                } else {
                  // AND group: return entries (could also include equivalents if needed)
                  return item.entries;
                }
              });
            }
            alternatives.push(ref);
          }
        }

        // Add quantity groups with alternatives
        for (const gq of groupQuantities) {
          if ("type" in gq && gq.type === "and") {
            // AND group
            const andGroup: IngredientQuantityAndGroup = {
              type: "and",
              entries: gq.entries,
            };
            if (gq.equivalents && gq.equivalents.length > 0) {
              andGroup.equivalents = gq.equivalents;
            }
            if (alternatives && alternatives.length > 0) {
              andGroup.alternatives = alternatives;
            }
            quantityGroups.push(andGroup);
          } else {
            // Simple group
            const quantityGroup: IngredientQuantityGroup =
              gq as IngredientQuantityGroup;
            if (alternatives && alternatives.length > 0) {
              quantityGroup.alternatives = alternatives;
            }
            quantityGroups.push(quantityGroup);
          }
        }
      }

      /* v8 ignore else -- @preserve */
      if (quantityGroups.length > 0) {
        ingredient.quantities = quantityGroups;
      }
    }
  }

  /**
   * Calculates ingredient quantities based on the provided choices.
   * Returns a list of computed ingredients with their total quantities.
   *
   * @param choices - The recipe choices to apply when computing quantities.
   *   If not provided, uses the default choices (first alternative for each item).
   * @returns An array of ComputedIngredient with quantityTotal calculated based on choices.
   */
  calc_ingredient_quantities(choices?: RecipeChoices): ComputedIngredient[] {
    // Use provided choices or derive default choices (index 0 for all)
    const effectiveChoices: RecipeChoices = choices || {
      ingredientItems: new Map(
        Array.from(this.choices.ingredientItems.keys()).map((k) => [k, 0]),
      ),
      ingredientGroups: new Map(
        Array.from(this.choices.ingredientGroups.keys()).map((k) => [k, 0]),
      ),
    };

    const ingredientQuantities = new Map<
      number,
      (QuantityWithExtendedUnit | FlatOrGroup<QuantityWithExtendedUnit>)[]
    >();

    // Track which ingredient indices are selected (either directly or as part of alternatives)
    const selectedIngredientIndices = new Set<number>();

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
              effectiveChoices.ingredientItems?.get(item.id) === i;
            const alternativeChoiceGroupIdx = item.group
              ? effectiveChoices.ingredientGroups?.get(item.group)
              : undefined;
            const alternativeChoiceGroup = item.group
              ? this.choices.ingredientGroups.get(item.group)
              : undefined;
            const isAlternativeChoiceGroup =
              alternativeChoiceGroup && alternativeChoiceGroupIdx !== undefined
                ? alternativeChoiceGroup[alternativeChoiceGroupIdx]?.itemId ===
                  item.id
                : false;

            // Determine if this ingredient is selected
            const isSelected =
              (!("group" in item) &&
                (item.alternatives.length === 1 || isAlternativeChoiceItem)) ||
              isAlternativeChoiceGroup;

            if (isSelected) {
              selectedIngredientIndices.add(alternative.index);

              if (alternative.itemQuantity) {
                // Build equivalents: primary quantity + any additional equivalents
                const allQuantities: QuantityWithExtendedUnit[] = [
                  {
                    quantity: alternative.itemQuantity.quantity,
                    unit: alternative.itemQuantity.unit,
                  },
                ];
                if (alternative.itemQuantity.equivalents) {
                  allQuantities.push(...alternative.itemQuantity.equivalents);
                }
                const equivalents:
                  | QuantityWithExtendedUnit
                  | FlatOrGroup<QuantityWithExtendedUnit> =
                  allQuantities.length === 1
                    ? allQuantities[0]!
                    : {
                        type: "or",
                        entries: allQuantities,
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
    }

    // Build computed ingredients - only include selected ingredients
    const computedIngredients: ComputedIngredient[] = [];
    for (let index = 0; index < this.ingredients.length; index++) {
      if (!selectedIngredientIndices.has(index)) continue;

      const ing = this.ingredients[index]!;
      const computed: ComputedIngredient = {
        name: ing.name,
      };
      if (ing.preparation) {
        computed.preparation = ing.preparation;
      }
      if (ing.flags) {
        computed.flags = ing.flags;
      }
      if (ing.extras) {
        computed.extras = ing.extras;
      }
      const quantities = ingredientQuantities.get(index);
      if (quantities && quantities.length > 0) {
        computed.quantityTotal = addEquivalentsAndSimplify(...quantities);
      }
      computedIngredients.push(computed);
    }

    return computedIngredients;
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
    newRecipe.servings = this.servings;
    return newRecipe;
  }
}
