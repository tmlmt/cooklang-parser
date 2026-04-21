import type {
  Metadata,
  Ingredient,
  IngredientExtras,
  IngredientItem,
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
  RawQuantityGroup,
  SpecificUnitSystem,
  Unit,
  MaybeScalableQuantity,
  Yield,
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
  quantityAlternativeRegex,
  inlineIngredientAlternativesRegex,
  arbitraryScalableRegex,
  variantTagRegex,
} from "../regex";
import {
  flushPendingItems,
  flushPendingNote,
  findAndUpsertIngredient,
  findAndUpsertCookware,
  parseQuantityValue,
  parseArbitraryQuantity,
  extractMetadata,
  unionOfSets,
  getAlternativeSignature,
  parseMarkdownSegments,
} from "../utils/parser_helpers";
import { addEquivalentsAndSimplify } from "../quantities/alternatives";
import { multiplyQuantityValue } from "../quantities/numeric";
import {
  toPlainUnit,
  toExtendedUnit,
  flattenPlainUnitGroup,
  convertQuantityToSystem,
  applyBestUnit,
} from "../quantities/mutations";
import { resolveUnit } from "../units/definitions";
import { isUnitCompatibleWithSystem } from "../units/compatibility";
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
    variants: [],
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
   * External storage for subgroup index tracking during parsing.
   * Maps groupKey → subgroupKey → index within the subgroups array.
   */
  private static subgroupIndices = new WeakMap<
    Recipe,
    Map<string, Map<string, number>>
  >();

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
   * Computes variant linkage for parsed items based on section and step tags.
   * Undefined means no variant restriction.
   */
  private getLinkedVariants(
    sectionVariants?: string[],
    stepVariants?: string[],
  ): string[] | undefined {
    if (!sectionVariants && !stepVariants) {
      return undefined;
    }
    if (!sectionVariants) {
      return [...stepVariants!];
    }
    if (!stepVariants) {
      return [...sectionVariants];
    }
    const stepSet = new Set(stepVariants);
    const intersection = sectionVariants.filter((v) => stepSet.has(v));
    return intersection;
  }

  /**
   * Checks whether an alternative linked to specific variants is active
   * for the requested variant.
   */
  private isAlternativeLinkedToVariant(
    alternative: IngredientAlternative,
    variant?: string,
  ): boolean {
    const linked = alternative.linkedVariants;
    if (!linked || linked.length === 0) {
      return true;
    }
    const isDefaultVariant = variant === undefined || variant === "*";
    if (isDefaultVariant) {
      return linked.includes("*");
    }
    return linked.includes(variant);
  }

  /**
   * Filters grouped choice subgroups based on active variant linkage.
   */
  private filterGroupSubgroupsForVariant(
    subgroups: IngredientAlternative[][],
    variant?: string,
  ): IngredientAlternative[][] {
    return subgroups.filter((subgroup) =>
      subgroup.every((alternative) =>
        this.isAlternativeLinkedToVariant(alternative, variant),
      ),
    );
  }

  /**
   * Creates a new Recipe instance.
   * @param content - The recipe content to parse.
   */
  constructor(content?: string) {
    Recipe.itemCounts.set(this, 0);
    Recipe.subgroupIndices.set(this, new Map());
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
    const parsed = parseArbitraryQuantity(regexMatchGroups.arbitraryQuantity);
    const name = regexMatchGroups.arbitraryName || undefined;
    const arbitrary: ArbitraryScalable = {
      quantity: parsed.quantity,
    };
    if (name) arbitrary.name = name;
    if (parsed.unit) arbitrary.unit = parsed.unit;
    intoArray.push({
      type: "arbitrary",
      index: this.arbitraries.push(arbitrary) - 1,
    });
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
        noteItems.push(...parseMarkdownSegments(text.slice(cursor, idx)));
      }

      this._parseArbitraryScalable(match.groups, noteItems);
      cursor = idx + match[0].length;
    }

    if (cursor < text.length) {
      noteItems.push(...parseMarkdownSegments(text.slice(cursor)));
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
        ? parseQuantityValue(quantityMatch.groups.quantity)
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
    linkedVariants?: string[],
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
      let itemQuantity: MaybeScalableQuantity | undefined = undefined;
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
        ...(linkedVariants && { linkedVariants: [...linkedVariants] }),
      };
      // Only add quantity fields and note if they exist
      const note = groups.ingredientNote?.trim();
      if (note) {
        alternative.note = note;
      }
      if (itemQuantity) {
        Object.assign(alternative, itemQuantity);
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
    linkedVariants?: string[],
  ): void {
    const match = ingredientMatchString.match(ingredientWithGroupKeyRegex);
    // This is a type guard to ensure match and match.groups are defined
    /* v8 ignore if -- @preserve */
    if (!match?.groups) return;
    const groups = match.groups;

    // Use variables for readability
    // @|<groupKey>/<subgroupKey>|<modifiers><name>{quantity%unit|altQuantities}(preparation)[note]
    const groupKey = groups.gIngredientGroupKey!;
    const subgroupKey = groups.gIngredientSubgroupKey;
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
    let itemQuantity: MaybeScalableQuantity | undefined = undefined;
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
      ...(linkedVariants && { linkedVariants: [...linkedVariants] }),
    };
    // Only add quantity fields if it exists
    if (itemQuantity) {
      Object.assign(alternative, itemQuantity);
    }
    // Add note if present
    const note = groups.gIngredientNote?.trim();
    if (note) {
      alternative.note = note;
    }

    const existingSubgroups = this.choices.ingredientGroups.get(groupKey);
    const existingAlternativesFlat = existingSubgroups?.flat();
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
    if (existingAlternativesFlat) {
      for (const alt of existingAlternativesFlat) {
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
    if (subgroupKey !== undefined) {
      newItem.subgroup = subgroupKey;
    }
    items.push(newItem);

    // Populate or update choices
    const choiceAlternative = deepClone(alternative);
    choiceAlternative.itemId = id;
    const existingChoice = this.choices.ingredientGroups.get(groupKey);
    const sgMap = Recipe.subgroupIndices.get(this)!;
    if (!existingChoice) {
      // New group: create first subgroup
      this.choices.ingredientGroups.set(groupKey, [[choiceAlternative]]);
      if (subgroupKey !== undefined) {
        sgMap.set(groupKey, new Map([[subgroupKey, 0]]));
      }
    } else if (subgroupKey !== undefined) {
      // Has subgroup key: find matching subgroup or create new one
      const groupSgMap = sgMap.get(groupKey);
      const existingIdx = groupSgMap?.get(subgroupKey);
      if (existingIdx !== undefined) {
        existingChoice[existingIdx]!.push(choiceAlternative);
      } else {
        const newIdx = existingChoice.length;
        existingChoice.push([choiceAlternative]);
        if (!groupSgMap) {
          sgMap.set(groupKey, new Map([[subgroupKey, newIdx]]));
        } else {
          groupSgMap.set(subgroupKey, newIdx);
        }
      }
    } else {
      // No subgroup key: each item forms its own subgroup
      existingChoice.push([choiceAlternative]);
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
  private _populateIngredientQuantities(): void {
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

  // Type for accumulated quantities (used internally by collectQuantityGroups)
  // Defined as a static type alias for the private method's return type
  /** @internal */
  private collectQuantityGroups(options?: GetIngredientQuantitiesOptions) {
    const { section, step, choices } = options || {};

    // Active variant (undefined or "*" = default)
    const activeVariant = choices?.variant;
    const isDefaultVariant =
      activeVariant === undefined || activeVariant === "*";

    // Determine sections to process
    const sectionsToProcess: Section[] =
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
      // Track which indices form each subgroup (inner array = one choice option)
      alternativeSubgroups: number[][];
    };

    // Map: ingredientIndex -> alternativeSignature -> accumulated data
    const ingredientGroups = new Map<
      number,
      Map<string | null, QuantityAccumulator>
    >();

    // Track selected ingredients (get quantities + usedAsPrimary) and all referenced ingredients
    const selectedIndices = new Set<number>();
    const referencedIndices = new Set<number>();
    // Track ingredient indices that should receive the "optional" flag
    // dynamically due to being in a variant-optional step ([?variant])
    const dynamicOptionalIndices = new Set<number>();

    for (const currentSection of sectionsToProcess) {
      // Skip sections that don't match the active variant
      if (currentSection.variants) {
        if (isDefaultVariant) {
          // Default variant: skip sections tagged with non-"*" variants
          if (!currentSection.variants.includes("*")) continue;
        } else {
          // Named variant: skip sections that don't include this variant
          if (!currentSection.variants.includes(activeVariant)) continue;
        }
      }

      const allSteps = currentSection.content.filter(
        (item): item is Step => item.type === "step",
      );

      // Track whether this section is optional
      const isOptionalSection = currentSection.optional === true;

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
        // Skip steps that don't match the active variant
        if (currentStep.variants) {
          if (isDefaultVariant) {
            if (!currentStep.variants.includes("*")) continue;
          } else {
            if (!currentStep.variants.includes(activeVariant)) continue;
          }
        }

        // Track whether this step is variant-optional
        const isOptionalStep =
          currentStep.optional === true || isOptionalSection;

        for (const item of currentStep.items.filter(
          (item): item is IngredientItem => item.type === "ingredient",
        )) {
          const isGrouped = "group" in item && item.group !== undefined;
          const allGroupSubgroups = isGrouped
            ? this.choices.ingredientGroups.get(item.group!)
            : undefined;
          const groupSubgroups = allGroupSubgroups
            ? this.filterGroupSubgroupsForVariant(
                allGroupSubgroups,
                activeVariant,
              )
            : undefined;

          // Determine selection state
          let selectedAltIndex = 0;
          let isSelected: boolean;
          let hasExplicitChoice: boolean;

          if (isGrouped) {
            const availableSubgroups = groupSubgroups!;
            const groupChoice = choices?.ingredientGroups?.get(item.group!);
            hasExplicitChoice = groupChoice !== undefined;

            // Variant-aware auto-selection for grouped items: when a named
            // variant is active and no explicit choice, look for subgroups
            // whose alternatives have a note matching the variant name
            if (!hasExplicitChoice && !isDefaultVariant) {
              const matchingSubgroupIdx = availableSubgroups.findIndex((sg) =>
                sg.some(
                  (alt) =>
                    alt.note &&
                    alt.note
                      .toLowerCase()
                      .includes(activeVariant.toLowerCase()),
                ),
              );
              if (
                matchingSubgroupIdx !== undefined &&
                matchingSubgroupIdx >= 0
              ) {
                const matchedSubgroup =
                  availableSubgroups[matchingSubgroupIdx]!;
                isSelected = matchedSubgroup.some(
                  (alt) => alt.itemId === item.id,
                );
                hasExplicitChoice = true; // treat as explicit so alternativeRefs are not built
                selectedAltIndex = 0;
              } else {
                isSelected = availableSubgroups[0]!.some(
                  (alt) => alt.itemId === item.id,
                );
              }
            } else {
              const targetSubgroupIndex = groupChoice ?? 0;
              const selectedSubgroup = availableSubgroups[targetSubgroupIndex];
              if (!selectedSubgroup) continue;
              isSelected = selectedSubgroup.some(
                (alt) => alt.itemId === item.id,
              );
            }
          } else {
            const itemChoice = choices?.ingredientItems?.get(item.id);
            hasExplicitChoice = itemChoice !== undefined;

            // Variant-aware auto-selection for inline alternatives: when a
            // named variant is active and no explicit choice, look for
            // alternatives whose note matches the variant name (substring,
            // case-insensitive). Multiple matches are kept as alternatives.
            if (!hasExplicitChoice && !isDefaultVariant) {
              const matchingIndices = item.alternatives
                .map((alt, idx) => ({ alt, idx }))
                .filter(
                  ({ alt }) =>
                    alt.note &&
                    alt.note
                      .toLowerCase()
                      .includes(activeVariant.toLowerCase()),
                )
                .map(({ idx }) => idx);
              if (matchingIndices.length > 0) {
                selectedAltIndex = matchingIndices[0]!;
                hasExplicitChoice = true; // suppress alternativeRefs for non-matching
              } else {
                selectedAltIndex = itemChoice ?? 0;
              }
            } else {
              selectedAltIndex = itemChoice ?? 0;
            }

            isSelected = true;
          }

          const alternative = item.alternatives[selectedAltIndex];
          if (!alternative || !isSelected) continue;

          selectedIndices.add(alternative.index);

          // Track dynamic optional flag for ingredients in variant-optional steps
          if (isOptionalStep) {
            dynamicOptionalIndices.add(alternative.index);
          }

          // Add all alternatives to referenced set (so indices remain valid in result)
          const allAltsFlat = (
            isGrouped ? groupSubgroups!.flat() : item.alternatives
          ).filter((alt): alt is IngredientAlternative => alt !== undefined);
          for (const alt of allAltsFlat) {
            referencedIndices.add(alt.index);
          }

          if (!alternative.quantity) continue;

          // Build quantity entry with equivalents
          const baseQty: QuantityWithExtendedUnit = {
            quantity: alternative.quantity,
            ...(alternative.unit && {
              unit: alternative.unit,
            }),
          };
          const quantityEntry = alternative.equivalents?.length
            ? { or: [baseQty, ...alternative.equivalents] }
            : baseQty;

          // Build alternative refs (only when no explicit choice)
          // Each inner array is one choice option (subgroup); items within
          // the same inner array are combined with "+" (AND).
          let alternativeRefs: AlternativeIngredientRef[][] | undefined;
          if (
            !hasExplicitChoice &&
            groupSubgroups &&
            groupSubgroups.length > 1
          ) {
            // For grouped items: alternatives are the other subgroups (not the current item's subgroup)
            const currentSubgroupIdx = groupSubgroups.findIndex((sg) =>
              sg.some((alt) => alt.itemId === item.id),
            );
            alternativeRefs = groupSubgroups
              .filter((_, idx) => idx !== currentSubgroupIdx)
              .map((subgroup) =>
                subgroup.map((otherAlt) => {
                  const ref: AlternativeIngredientRef = {
                    index: otherAlt.index,
                  };
                  if (otherAlt.quantity) {
                    const altQty: QuantityWithPlainUnit = {
                      quantity: otherAlt.quantity,
                      ...(otherAlt.unit && {
                        unit: otherAlt.unit.name,
                      }),
                      ...(otherAlt.equivalents && {
                        equivalents: otherAlt.equivalents.map(
                          (eq: QuantityWithExtendedUnit) =>
                            toPlainUnit(eq) as QuantityWithPlainUnit,
                        ),
                      }),
                    };
                    ref.quantities = [altQty];
                  }
                  return ref;
                }),
              );
          } else if (
            !hasExplicitChoice &&
            !isGrouped &&
            allAltsFlat.length > 1
          ) {
            alternativeRefs = allAltsFlat
              .filter((alt) => alt.index !== alternative.index)
              .map((otherAlt) => {
                const ref: AlternativeIngredientRef = { index: otherAlt.index };
                if (otherAlt.quantity) {
                  const altQty: QuantityWithPlainUnit = {
                    quantity: otherAlt.quantity,
                    ...(otherAlt.unit && {
                      unit: otherAlt.unit.name,
                    }),
                    ...(otherAlt.equivalents && {
                      equivalents: otherAlt.equivalents.map(
                        (eq: QuantityWithExtendedUnit) =>
                          toPlainUnit(eq) as QuantityWithPlainUnit,
                      ),
                    }),
                  };
                  ref.quantities = [altQty];
                }
                return [ref];
              });
          }

          // Get or create accumulator for this ingredient/signature
          // Use unit type+system for signature only when there are alternatives,
          // so compatible units (g/kg) group together but incompatible (cup/g) stay separate
          const altIndices = getAlternativeSignature(alternativeRefs) ?? "";
          let signature: string | null;
          if (isGrouped) {
            const resolvedUnit = resolveUnit(alternative.unit?.name);
            signature = `group:${item.group}|${altIndices}|${resolvedUnit.type}`;
          } else if (altIndices) {
            // Has alternatives: include unit type to keep incompatible units separate
            const resolvedUnit = resolveUnit(alternative.unit?.name);
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
              alternativeSubgroups: [],
            });
          }
          const group = groupsForIng.get(signature)!;

          group.quantities.push(quantityEntry);

          // Record subgroup structure (only on first encounter for this signature)
          if (
            alternativeRefs &&
            alternativeRefs.length > 0 &&
            group.alternativeSubgroups.length === 0
          ) {
            group.alternativeSubgroups = alternativeRefs.map((subgroup) =>
              subgroup.map((ref) => ref.index),
            );
          }

          // Accumulate alternative quantities
          for (const subgroup of alternativeRefs ?? []) {
            for (const ref of subgroup) {
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
    }

    return {
      ingredientGroups,
      selectedIndices,
      referencedIndices,
      dynamicOptionalIndices,
    };
  }

  /**
   * Returns choices available for a given active variant.
   *
   * For grouped alternatives, only groups with at least two available
   * subgroups are returned.
   */
  getChoicesForVariant(variant?: string): RecipeAlternatives {
    const ingredientItems = new Map<string, IngredientAlternative[]>();
    for (const [itemId, alternatives] of this.choices.ingredientItems) {
      const isVisible = alternatives.some((alternative) =>
        this.isAlternativeLinkedToVariant(alternative, variant),
      );
      if (isVisible) {
        ingredientItems.set(itemId, alternatives);
      }
    }

    const ingredientGroups = new Map<string, IngredientAlternative[][]>();
    for (const [groupId, subgroups] of this.choices.ingredientGroups) {
      const filtered = this.filterGroupSubgroupsForVariant(subgroups, variant);
      // v8 ignore else -- @preserve: only include groups with at least 2 subgroups (otherwise it's not really a choice)
      if (filtered.length > 1) {
        ingredientGroups.set(groupId, filtered);
      }
    }

    return {
      ingredientItems,
      ingredientGroups,
      variants: [...this.choices.variants],
    };
  }

  /**
   * Gets the raw (unprocessed) quantity groups for each ingredient, before
   * any summation or equivalents simplification. This is useful for cross-recipe
   * aggregation (e.g., in {@link ShoppingList}), where quantities from multiple
   * recipes should be combined before processing.
   *
   * @param options - Options for filtering and choice selection (same as {@link getIngredientQuantities}).
   * @returns Array of {@link RawQuantityGroup} objects, one per ingredient with quantities.
   *
   * @example
   * ```typescript
   * const rawGroups = recipe.getRawQuantityGroups();
   * // Each group has: name, usedAsPrimary, flags, quantities[]
   * // quantities are the raw QuantityWithExtendedUnit or FlatOrGroup entries
   * ```
   */
  getRawQuantityGroups(
    options?: GetIngredientQuantitiesOptions,
  ): RawQuantityGroup[] {
    const {
      ingredientGroups,
      selectedIndices,
      referencedIndices,
      dynamicOptionalIndices,
    } = this.collectQuantityGroups(options);

    const result: RawQuantityGroup[] = [];

    for (let index = 0; index < this.ingredients.length; index++) {
      if (!referencedIndices.has(index)) continue;

      const orig = this.ingredients[index]!;
      const usedAsPrimary = selectedIndices.has(index);

      // Merge static flags with dynamic optional flag from variant-optional steps
      let flags = orig.flags;
      if (dynamicOptionalIndices.has(index) && !flags?.includes("optional")) {
        flags = [...(flags ?? []), "optional"];
      }

      // Collect all raw quantities across all signature groups
      const quantities: (
        | QuantityWithExtendedUnit
        | FlatOrGroup<QuantityWithExtendedUnit>
      )[] = [];

      if (usedAsPrimary) {
        const groupsForIng = ingredientGroups.get(index);
        if (groupsForIng) {
          for (const [, group] of groupsForIng) {
            quantities.push(...group.quantities);
          }
        }
      }

      result.push({
        name: orig.name,
        ...(usedAsPrimary && { usedAsPrimary: true }),
        ...(flags && { flags }),
        quantities,
      });
    }

    return result;
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
    const {
      ingredientGroups,
      selectedIndices,
      referencedIndices,
      dynamicOptionalIndices,
    } = this.collectQuantityGroups(options);

    // Build result
    const result: Ingredient[] = [];

    for (let index = 0; index < this.ingredients.length; index++) {
      if (!referencedIndices.has(index)) continue;

      const orig = this.ingredients[index]!;

      // Merge static flags with dynamic optional flag from variant-optional steps
      let flags = orig.flags;
      if (dynamicOptionalIndices.has(index) && !flags?.includes("optional")) {
        flags = [...(flags ?? []), "optional"];
      }

      const ing: Ingredient = {
        name: orig.name,
        ...(orig.preparation && { preparation: orig.preparation }),
        ...(flags && { flags }),
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

            // Build alternatives from accumulated quantities, preserving subgroup structure
            let alternatives: AlternativeIngredientRef[][] | undefined;
            if (group.alternativeSubgroups.length > 0) {
              alternatives = group.alternativeSubgroups.map((subgroupIndices) =>
                subgroupIndices.map((altIdx) => {
                  const altQtys = group.alternativeQuantities.get(altIdx)!;
                  return {
                    index: altIdx,
                    ...(altQtys.length > 0 && {
                      quantities: flattenPlainUnitGroup(
                        addEquivalentsAndSimplify(altQtys, this.unitSystem),
                      ).flatMap(
                        /* v8 ignore next -- item.and branch requires complex nested AND-with-equivalents structure */
                        (item) => ("quantity" in item ? [item] : item.and),
                      ),
                    }),
                  };
                }),
              );
            }

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
   * Returns the list of cookware items that are used in the active variant.
   * Cookware in steps/sections not matching the active variant are excluded.
   * Hidden cookware is always excluded.
   *
   * @param options - Options for filtering:
   *   - `choices`: The choices to apply (only `variant` is used)
   * @returns Array of Cookware objects referenced by active steps
   *
   * @example
   * ```typescript
   * // Get all cookware for the default variant
   * const cookware = recipe.getCookwareForVariant();
   *
   * // Get cookware for a specific variant
   * const veganCookware = recipe.getCookwareForVariant({ choices: { variant: 'vegan' } });
   * ```
   */
  getCookwareForVariant(
    options?: Pick<GetIngredientQuantitiesOptions, "choices">,
  ): Cookware[] {
    const { choices } = options || {};
    const activeVariant = choices?.variant;
    const isDefaultVariant =
      activeVariant === undefined || activeVariant === "*";

    const cookwareIndices = new Set<number>();

    for (const currentSection of this.sections) {
      // Skip sections that don't match the active variant
      if (currentSection.variants) {
        if (isDefaultVariant) {
          if (!currentSection.variants.includes("*")) continue;
        } else {
          if (!currentSection.variants.includes(activeVariant)) continue;
        }
      }

      const allSteps = currentSection.content.filter(
        (item): item is Step => item.type === "step",
      );

      for (const currentStep of allSteps) {
        // Skip steps that don't match the active variant
        if (currentStep.variants) {
          if (isDefaultVariant) {
            if (!currentStep.variants.includes("*")) continue;
          } else {
            if (!currentStep.variants.includes(activeVariant)) continue;
          }
        }

        for (const item of currentStep.items) {
          if (item.type === "cookware") {
            cookwareIndices.add(item.index);
          }
        }
      }
    }

    return this.cookware.filter(
      (cw, idx) => cookwareIndices.has(idx) && !cw.flags?.includes("hidden"),
    );
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
    let stepVariants: string[] | undefined;
    let stepOptional: boolean | undefined;
    const discoveredVariants = new Set<string>();

    // We parse content line by line
    for (const line of cleanContent) {
      // A blank line triggers flushing pending stuff
      if (line.trim().length === 0) {
        flushPendingItems(section, items, stepVariants, stepOptional);
        stepVariants = undefined;
        stepOptional = undefined;
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
        flushPendingItems(section, items, stepVariants, stepOptional);
        stepVariants = undefined;
        stepOptional = undefined;
        flushPendingNote(
          section,
          noteText ? this._parseNoteText(noteText) : [],
        );
        noteText = "";

        // Strip = signs and extract section name
        let sectionName = line.replace(/^=+|=+$/g, "").trim();

        // Parse variant tag from section name (e.g. "[vegan] Sauce")
        let sectionVariants: string[] | undefined;
        let sectionOptional: boolean | undefined;
        const sectionVarMatch = sectionName.match(variantTagRegex);
        if (sectionVarMatch?.groups) {
          const isOptionalPrefix =
            sectionVarMatch.groups.variantOptionalPrefix === "?";
          const names = (sectionVarMatch.groups.variantNames ?? "")
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0);
          if (names.length > 0) {
            sectionVariants = names;
            for (const v of names) discoveredVariants.add(v);
          }
          if (isOptionalPrefix) {
            sectionOptional = true;
          }
          sectionName = sectionName.slice(sectionVarMatch[0].length).trim();
        }

        if (!section.isBlank()) {
          this.sections.push(section);
        }
        section = new Section(sectionName, sectionVariants, sectionOptional);
        blankLineBefore = true;
        inNote = false;
        continue;
      }

      // New note
      if (blankLineBefore && line.startsWith(">")) {
        flushPendingItems(section, items, stepVariants, stepOptional);
        stepVariants = undefined;
        stepOptional = undefined;
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

      // Check for variant tag on the first line of a new step
      let currentLine = line;
      if (items.length === 0) {
        const varMatch = currentLine.match(variantTagRegex);
        if (varMatch?.groups) {
          const isOptionalPrefix =
            varMatch.groups.variantOptionalPrefix === "?";
          const names = (varMatch.groups.variantNames ?? "")
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0);
          if (names.length > 0) {
            stepVariants = names;
            for (const v of names) discoveredVariants.add(v);
          }
          // [?] with no variant names means optional for all variants
          if (isOptionalPrefix) {
            stepOptional = true;
          }
          currentLine = currentLine.slice(varMatch[0].length);
          // If the line is now empty after stripping the tag, skip it
          if (currentLine.trim().length === 0) {
            blankLineBefore = false;
            continue;
          }
        }
      }

      // Detecting items
      let cursor = 0;
      const linkedVariants = this.getLinkedVariants(
        section.variants,
        stepVariants,
      );
      for (const match of currentLine.matchAll(tokensRegex)) {
        const idx = match.index;
        /* v8 ignore else -- @preserve */
        if (idx > cursor) {
          items.push(...parseMarkdownSegments(currentLine.slice(cursor, idx)));
        }

        const groups = match.groups!;

        // Ingredient items with potential in-line alternatives
        if (groups.mIngredientName || groups.sIngredientName) {
          this._parseIngredientWithAlternativeRecursive(
            match[0],
            items,
            linkedVariants,
          );
        }
        // Ingredient items part of a group of alternative ingredients
        else if (groups.gmIngredientName || groups.gsIngredientName) {
          this._parseIngredientWithGroupKey(match[0], items, linkedVariants);
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
            ? parseQuantityValue(quantityRaw)
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
          const duration = parseQuantityValue(durationStr);
          const timerObj: Timer = {
            name,
            duration,
            unit,
          };
          items.push({ type: "timer", index: this.timers.push(timerObj) - 1 });
        }

        cursor = idx + match[0].length;
      }

      if (cursor < currentLine.length) {
        items.push(...parseMarkdownSegments(currentLine.slice(cursor)));
      }

      blankLineBefore = false;
    }

    // End of content reached: pushing all temporarily saved elements
    flushPendingItems(section, items, stepVariants, stepOptional);
    flushPendingNote(section, noteText ? this._parseNoteText(noteText) : []);
    if (!section.isBlank()) {
      this.sections.push(section);
    }

    // Populate discovered variants
    // Union of metadata variants and discovered step/section variants
    const metaVariants = this.metadata.variants ?? [];
    const allVariants = new Set([...metaVariants, ...discoveredVariants]);
    if (allVariants.size > 0) {
      this.choices.variants = [...allVariants];
    }

    this._populateIngredientQuantities();
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
        if (alternative.quantity) {
          const scaleFactor = alternative.scalable ? Big(factor) : 1;
          // Scale the primary quantity
          if (
            alternative.quantity.type !== "fixed" ||
            alternative.quantity.value.type !== "text"
          ) {
            alternative.quantity = multiplyQuantityValue(
              alternative.quantity,
              scaleFactor,
            );
          }
          // Scale equivalents if any
          if (alternative.equivalents) {
            alternative.equivalents = alternative.equivalents.map(
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
              quantity: alternative.quantity,
              unit: alternative.unit,
            },
            unitSystem,
          );
          alternative.quantity = optimizedPrimary.quantity;
          alternative.unit = optimizedPrimary.unit;

          // Apply to equivalents
          if (alternative.equivalents) {
            alternative.equivalents = alternative.equivalents.map((eq) =>
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
    for (const subgroups of newRecipe.choices.ingredientGroups.values()) {
      for (const subgroup of subgroups) {
        scaleAlternativesBy(subgroup, factor);
      }
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
      const optimized = applyBestUnit(
        { quantity: arbitrary.quantity, unit: arbitrary.unit },
        unitSystem,
      );
      arbitrary.quantity = optimized.quantity as FixedNumericValue;
      arbitrary.unit = optimized.unit;
    }

    newRecipe._populateIngredientQuantities();

    newRecipe.servings = Big(originalServings).times(factor).toNumber();

    // Scale metadata: servings and serves (plain numbers)
    for (const metaVar of ["servings", "serves"] as const) {
      if (typeof newRecipe.metadata[metaVar] === "number") {
        newRecipe.metadata[metaVar] = Big(newRecipe.metadata[metaVar])
          .times(factor)
          .toNumber();
      }
    }

    // Scale metadata: yield (Yield object with quantity + optional unit)
    /* v8 ignore else -- @preserve */
    if (newRecipe.metadata.yield && this.metadata.yield) {
      const original = this.metadata.yield;
      // Skip scaling for text-value yields (e.g. "yield: some text")
      if (
        original.quantity.type === "fixed" &&
        original.quantity.value.type === "text"
      ) {
        // Keep the yield as-is
      } else {
        const scaledQuantity = multiplyQuantityValue(
          original.quantity,
          factor,
        ) as FixedNumericValue;
        // Apply best unit optimization
        const optimized = applyBestUnit(
          { quantity: scaledQuantity, unit: original.unit },
          unitSystem,
        );
        const scaled: Yield = {
          quantity: optimized.quantity,
        };
        if (optimized.unit) scaled.unit = optimized.unit;
        if (original.textBefore) scaled.textBefore = original.textBefore;
        if (original.textAfter) scaled.textAfter = original.textAfter;
        newRecipe.metadata.yield = scaled;
      }
    }

    return newRecipe;
  }

  /**
   * Converts all ingredient quantities in the recipe to a target unit system.
   *
   * @param system - The target unit system to convert to (metric, US, UK, JP)
   * @param method - How to handle existing quantities:
   *   - "keep": Keep all existing equivalents (swap if needed, or add converted)
   *   - "replace": Replace primary with target system quantity, discard equivalent used for conversion
   *   - "remove": Only keep target system quantity, delete all equivalents
   * @returns A new Recipe instance with converted quantities
   *
   * @example
   * ```typescript
   * // Convert a recipe to metric, keeping original units as equivalents
   * const metricRecipe = recipe.convertTo("metric", "keep");
   *
   * // Convert to US units, removing all other equivalents
   * const usRecipe = recipe.convertTo("US", "remove");
   * ```
   */
  convertTo(
    system: SpecificUnitSystem,
    method: "keep" | "replace" | "remove",
  ): Recipe {
    const newRecipe = this.clone();

    /**
     * Helper to build new primary quantity fields from a converted quantity
     */
    function buildNewPrimary(
      convertedQty: QuantityWithExtendedUnit,
      oldPrimary: QuantityWithExtendedUnit,
      remainingEquivalents: QuantityWithExtendedUnit[],
      scalable: boolean,
      integerProtected: boolean | undefined,
      source: "converted" | "swapped",
    ): MaybeScalableQuantity {
      const newUnit: Unit | undefined =
        integerProtected && convertedQty.unit
          ? { name: convertedQty.unit.name, integerProtected: true }
          : convertedQty.unit;

      const newPrimary: MaybeScalableQuantity = {
        quantity: convertedQty.quantity,
        unit: newUnit,
        scalable,
      };

      if (method === "remove") {
        return newPrimary;
      } else if (method === "replace") {
        // An equivalent was converted and replaced, we still want to keep the oldPrimary
        if (source === "converted") remainingEquivalents.push(oldPrimary);
        if (remainingEquivalents.length > 0) {
          // Keep remaining equivalents
          newPrimary.equivalents = remainingEquivalents;
        }
      } else {
        // method === "keep": include old primary + remaining equivalents
        newPrimary.equivalents = [oldPrimary, ...remainingEquivalents];
      }

      return newPrimary;
    }

    /**
     * Convert a single alternative's quantity to the target system.
     */
    function convertAlternativeQuantity(
      alternative: IngredientAlternative & MaybeScalableQuantity,
    ): MaybeScalableQuantity {
      const primaryUnit = resolveUnit(alternative.unit?.name);
      const equivalents = alternative.equivalents ?? [];
      const oldPrimary: QuantityWithExtendedUnit = {
        quantity: alternative.quantity,
        unit: alternative.unit,
      };

      // Check if primary is already in target system
      if (
        primaryUnit.type !== "other" &&
        isUnitCompatibleWithSystem(primaryUnit, system)
      ) {
        // Primary is already in target system
        if (method === "remove") {
          return {
            quantity: alternative.quantity,
            unit: alternative.unit,
            scalable: alternative.scalable,
          };
        }
        return {
          quantity: alternative.quantity,
          unit: alternative.unit,
          scalable: alternative.scalable,
          equivalents,
        };
      }

      // Look for an equivalent in the target system
      const targetEquivIndex = equivalents.findIndex((eq) => {
        const eqUnit = resolveUnit(eq.unit?.name);
        return (
          eqUnit.type !== "other" && isUnitCompatibleWithSystem(eqUnit, system)
        );
      });

      if (targetEquivIndex !== -1) {
        // Found an equivalent in target system - swap with primary
        const targetEquiv = equivalents[targetEquivIndex]!;
        const remainingEquivalents = equivalents.filter(
          (_, i) => i !== targetEquivIndex,
        );
        return buildNewPrimary(
          targetEquiv,
          oldPrimary,
          remainingEquivalents,
          alternative.scalable,
          targetEquiv.unit?.integerProtected,
          "swapped",
        );
      }

      // No equivalent in target system - try to convert from primary
      const converted = convertQuantityToSystem(oldPrimary, system);

      if (converted && converted.unit) {
        return buildNewPrimary(
          converted,
          oldPrimary,
          equivalents,
          alternative.scalable,
          alternative.unit?.integerProtected,
          "swapped",
        );
      }

      // Primary cannot be converted - try to convert from equivalents
      for (let i = 0; i < equivalents.length; i++) {
        const equiv = equivalents[i]!;
        const convertedEquiv = convertQuantityToSystem(equiv, system);

        // v8 ignore else -- @preserve
        if (convertedEquiv && convertedEquiv.unit) {
          const remainingEquivalents =
            method === "keep"
              ? equivalents
              : equivalents.filter((_, idx) => idx !== i);
          return buildNewPrimary(
            convertedEquiv,
            oldPrimary,
            remainingEquivalents,
            alternative.scalable,
            equiv.unit?.integerProtected,
            "converted",
          );
        }
      }

      // Cannot convert - return as-is (or with cleared equivalents for "remove")
      // v8 ignore next -- @preserve
      if (method === "remove") {
        return {
          quantity: alternative.quantity,
          unit: alternative.unit,
          scalable: alternative.scalable,
        };
      } else {
        return {
          quantity: alternative.quantity,
          unit: alternative.unit,
          scalable: alternative.scalable,
          equivalents,
        };
      }
    }

    /**
     * Convert all alternatives in a list
     */
    function convertAlternatives(alternatives: IngredientAlternative[]) {
      for (const alternative of alternatives) {
        // v8 ignore else -- @preserve
        if (alternative.quantity) {
          const converted = convertAlternativeQuantity(
            alternative,
          );
          alternative.quantity = converted.quantity;
          alternative.unit = converted.unit;
          (
            alternative
          ).scalable = converted.scalable;
          alternative.equivalents = converted.equivalents;
        }
      }
    }

    // Convert IngredientItems in sections
    for (const section of newRecipe.sections) {
      for (const step of section.content.filter(
        (item) => item.type === "step",
      )) {
        for (const item of step.items.filter(
          (item) => item.type === "ingredient",
        )) {
          convertAlternatives(item.alternatives);
        }
      }
    }

    // Convert Choices
    for (const subgroups of newRecipe.choices.ingredientGroups.values()) {
      for (const subgroup of subgroups) {
        convertAlternatives(subgroup);
      }
    }
    for (const alternatives of newRecipe.choices.ingredientItems.values()) {
      convertAlternatives(alternatives);
    }

    // Re-aggregate ingredient quantities
    newRecipe._populateIngredientQuantities();

    // Setting the unit system in 'keep' mode will convert all equivalents to that system
    // which will lead to duplicates
    if (method !== "keep") Recipe.unitSystems.set(newRecipe, system);

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
      const newSection = new Section(
        section.name,
        section.variants,
        section.optional,
      );
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
