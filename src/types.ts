import type { Recipe } from "./classes/recipe";
import { Section } from "./classes/section";

/**
 * Represents the metadata of a recipe.
 * @category Types
 */
export interface Metadata {
  /** The title of the recipe. */
  title?: string;
  /** The tags of the recipe. */
  tags?: string[];
  /** The source of the recipe. */
  source?: string;
  /** The source name of the recipe. */
  "source.name"?: string;
  /** The source url of the recipe. */
  "source.url"?: string;
  /** The source author of the recipe. */
  "source.author"?: string;
  /** The author of the recipe. */
  author?: string;
  /** The number of servings the recipe makes.
   * Should be either a number or a string which starts with a number
   * (which will be used for scaling) followed by a comma and then
   * whatever you want.
   *
   * Interchangeable with `yield` or `serves`. If multiple ones are defined,
   * the prevailance order for the number which will used for scaling
   * is `servings` \> `yield` \> `serves`.
   *
   * @example
   * ```yaml
   * servings: 4
   * ```
   *
   * @example
   * ```yaml
   * servings: 2, a few
   * ```
   */
  servings?: number | string;
  /** The yield of the recipe.
   * Should be either a number or a string which starts with a number
   * (which will be used for scaling) followed by a comma and then
   * whatever you want.
   *
   * Interchangeable with `servings` or `serves`. If multiple ones are defined,
   * the prevailance order for the number which will used for scaling
   * is `servings` \> `yield` \> `serves`. See {@link Metadata.servings | servings}
   * for examples.
   */
  yield?: number | string;
  /** The number of people the recipe serves.
   * Should be either a number or a string which starts with a number
   * (which will be used for scaling) followed by a comma and then
   * whatever you want.
   *
   * Interchangeable with `servings` or `yield`. If multiple ones are defined,
   * the prevailance order for the number which will used for scaling
   * is `servings` \> `yield` \> `serves`. See {@link Metadata.servings | servings}
   * for examples.
   */
  serves?: number | string;
  /** The course of the recipe. */
  course?: string;
  /** The category of the recipe. */
  category?: string;
  /** The locale of the recipe. */
  locale?: string;
  /**
   *  The preparation time of the recipe.
   *  Will not be further parsed into any DateTime format nor normalize
   */
  "prep time"?: string;
  /**
   *  Alias of `prep time`
   */
  "time.prep"?: string;
  /**
   *  The cooking time of the recipe.
   *  Will not be further parsed into any DateTime format nor normalize
   */
  "cook time"?: string;
  /**
   *  Alias of `cook time`
   */
  "time.cook"?: string;
  /**
   *  The total time of the recipe.
   *  Will not be further parsed into any DateTime format nor normalize
   */
  "time required"?: string;
  /*
   * Alias of `time required`
   */
  time?: string;
  /*
   * Alias of `time required`
   */
  duration?: string;
  /** The difficulty of the recipe. */
  difficulty?: string;
  /** The cuisine of the recipe. */
  cuisine?: string;
  /** The diet of the recipe. */
  diet?: string;
  /** The description of the recipe. */
  description?: string;
  /** The images of the recipe. Alias of `pictures` */
  images?: string[];
  /** The images of the recipe. Alias of `images` */
  pictures?: string[];
  /** The picture of the recipe. Alias of `picture` */
  image?: string;
  /** The picture of the recipe. Alias of `image` */
  picture?: string;
  /** The introduction of the recipe. */
  introduction?: string;
  /**
   * The unit system used in the recipe for ambiguous units like tsp, tbsp, cup.
   * See [Unit Systems Guide](/guide-units) for more information.
   * This stores the original value as written by the user.
   */
  "unit system"?: string;
}

/**
 * Represents the extracted metadata from a recipe.
 * @category Types
 */
export interface MetadataExtract {
  /** The metadata of the recipe. */
  metadata: Metadata;
  /** The number of servings the recipe makes. Used for scaling */
  servings?: number;
  /** The normalized unit system for the recipe. */
  unitSystem?: SpecificUnitSystem;
}

/**
 * Represents a quantity described by text, e.g. "a pinch"
 * @category Types
 */
export interface TextValue {
  type: "text";
  text: string;
}

/**
 * Represents a quantity described by a decimal number, e.g. "1.5"
 * @category Types
 */
export interface DecimalValue {
  type: "decimal";
  decimal: number;
}

/**
 * Represents a quantity described by a fraction, e.g. "1/2"
 * @category Types
 */
export interface FractionValue {
  type: "fraction";
  /** The numerator of the fraction */
  num: number;
  /** The denominator of the fraction */
  den: number;
}

/**
 * Represents a single, fixed quantity.
 * This can be a text, decimal, or fraction.
 * @category Types
 */
export interface FixedValue {
  type: "fixed";
  value: TextValue | DecimalValue | FractionValue;
}

/**
 * Represents a single, fixed numeric quantity.
 * This can be a decimal or fraction.
 * @category Types
 */
export interface FixedNumericValue {
  type: "fixed";
  value: DecimalValue | FractionValue;
}

/**
 * Represents a range of quantities, e.g. "1-2"
 * @category Types
 */
export interface Range {
  type: "range";
  min: DecimalValue | FractionValue;
  max: DecimalValue | FractionValue;
}

/**
 * Represents a possible state modifier or other flag for an ingredient in a recipe
 * @category Types
 */
export type IngredientFlag = "optional" | "hidden" | "recipe";

/**
 * Represents the collection of possible additional metadata for an ingredient in a recipe
 * @category Types
 */
export interface IngredientExtras {
  /**
   * The path of the ingredient-recipe, relative to the present recipe
   * Used if: the ingredient is a recipe
   *
   * @example
   * ```cooklang
   * Take @./essentials/doughs/pizza dough{1} out of the freezer and let it unfreeze overnight
   * ```
   * Would lead to:
   * ```yaml
   * path: 'essentials/doughts/pizza dough.cook'
   * ```
   */
  path: string;
}

/**
 * Represents a reference to an alternative ingredient along with its quantities.
 *
 * Used in {@link IngredientQuantityGroup} to describe what other ingredients
 * could be used in place of the main ingredient.
 * @category Types
 */
export interface AlternativeIngredientRef {
  /** The index of the alternative ingredient within the {@link Recipe.ingredients} array. */
  index: number;
  /** The quantities of the alternative ingredient. Multiple entries when units are incompatible. */
  quantities?: QuantityWithPlainUnit[];
}

/**
 * Represents a group of summed quantities for an ingredient, optionally with alternatives.
 * Quantities with the same alternative signature are summed together into a single group.
 * When units are incompatible, separate IngredientQuantityGroup entries are created instead of merging.
 * @category Types
 */
export interface IngredientQuantityGroup extends QuantityWithPlainUnit {
  /**
   * References to alternative ingredients for this quantity group.
   * If undefined, this group has no alternatives.
   */
  alternatives?: AlternativeIngredientRef[];
}

/**
 * Represents an AND group of quantities when primary units are incompatible but equivalents can be summed.
 * For example: 1 large carrot + 2 small carrots, both with cup equivalents (resp. 2 cup and 1.5 cup) that sum to 5 cups.
 * @category Types
 */
export interface IngredientQuantityAndGroup extends FlatAndGroup<QuantityWithPlainUnit> {
  /**
   * The summed equivalent quantities (e.g., "5 cups" from summing "1.5 cup + 2 cup + 1.5 cup").
   */
  equivalents?: QuantityWithPlainUnit[];
  /**
   * References to alternative ingredients for this quantity group.
   * If undefined, this group has no alternatives.
   */
  alternatives?: AlternativeIngredientRef[];
}

/**
 * Represents an ingredient in a recipe.
 * @category Types
 */
export interface Ingredient {
  /** The name of the ingredient. */
  name: string;
  /**
   * Represents the quantities list for an ingredient as groups.
   * Each group contains summed quantities that share the same alternative signature.
   * Groups can be either simple (single unit) or AND groups (incompatible primary units with summed equivalents).
   * Only populated for primary ingredients (not alternative-only).
   * Quantities without alternatives are merged opportunistically when units are compatible.
   * Quantities with alternatives are only merged if the alternatives are exactly the same.
   */
  quantities?: (IngredientQuantityGroup | IngredientQuantityAndGroup)[];
  /** The preparation of the ingredient. */
  preparation?: string;
  /** The list of indexes of the ingredients mentioned in the preparation as alternatives to this ingredient */
  alternatives?: Set<number>;
  /**
   * True if this ingredient appears as the primary choice (first in an alternatives list).
   * Only primary ingredients have quantities populated directly.
   *
   * Alternative-only ingredients (usedAsPrimary undefined/false) have their quantities
   * available via the {@link Recipe.choices} structure.
   */
  usedAsPrimary?: boolean;
  /** A list of potential state modifiers or other flags for the ingredient */
  flags?: IngredientFlag[];
  /** The collection of potential additional metadata for the ingredient */
  extras?: IngredientExtras;
}

/**
 * Represents a contributor to an ingredient's total quantity, corresponding
 * to a single mention in the recipe text. It can contain multiple
 * equivalent quantities (e.g., in different units).
 * @category Types
 */
export interface IngredientItemQuantity extends QuantityWithExtendedUnit {
  /**
   * A list of equivalent quantities/units for this ingredient mention besides the primary quantity.
   * For `@salt{1%tsp|5%g}`, the main quantity is 1 tsp and the equivalents will contain 5 g.
   */
  equivalents?: QuantityWithExtendedUnit[];
  /** Indicates whether this quantity should be scaled when the recipe serving size changes. */
  scalable: boolean;
}

/**
 * Represents a single ingredient choice within a single or a group of `IngredientItem`s. It points
 * to a specific ingredient and its corresponding quantity information.
 * @category Types
 */
export interface IngredientAlternative {
  /** The index of the ingredient within the {@link Recipe.ingredients} array. */
  index: number;
  /** The quantity of this specific mention of the ingredient */
  itemQuantity?: IngredientItemQuantity;
  /** The alias/name of the ingredient as it should be displayed for this occurrence. */
  displayName: string;
  /** An optional note for this specific choice (e.g., "for a vegan version"). */
  note?: string;
  /** When {@link Recipe.choices} is populated for alternatives ingredients
   * with group keys: the id of the corresponding ingredient item (e.g. "ingredient-item-2").
   * Can be useful for creating alternative selection UI elements with anchor links */
  itemId?: string;
}

/**
 * Represents an ingredient item in a recipe step.
 * @category Types
 */
export interface IngredientItem {
  /** The type of the item. */
  type: "ingredient";
  /** The item identifier */
  id: string;
  /**
   * A list of alternative ingredient choices. For a standard ingredient,
   * this array will contain a single element.
   */
  alternatives: IngredientAlternative[];
  /**
   * An optional identifier for linking distributed alternatives. If multiple
   * `IngredientItem`s in a recipe share the same `group` ID (e.g., from
   * `@|group|...` syntax), they represent a single logical choice.
   */
  group?: string;
}

/**
 * Represents the choices one can make in a recipe
 * @category Types
 */
export interface RecipeAlternatives {
  /** Map of choices that can be made at Ingredient StepItem level
   * - Keys are the Ingredient StepItem IDs (e.g. "ingredient-item-2")
   * - Values are arrays of IngredientAlternative objects representing the choices available for that item
   */
  ingredientItems: Map<string, IngredientAlternative[]>;
  /** Map of choices that can be made for Grouped Ingredient StepItem's
   * - Keys are the Group IDs (e.g. "eggs" for `@|eggs|...`)
   * - Values are arrays of IngredientAlternative objects representing the choices available for that group
   */
  ingredientGroups: Map<string, IngredientAlternative[]>;
}

/**
 * Represents the choices to apply when computing ingredient quantities.
 * Maps item/group IDs to the index of the selected alternative.
 * @category Types
 */
export interface RecipeChoices {
  /** Map of choices that can be made at Ingredient StepItem level */
  ingredientItems?: Map<string, number>;
  /** Map of choices that can be made for Grouped Ingredient StepItem's */
  ingredientGroups?: Map<string, number>;
}

/**
 * Options for the {@link Recipe.getIngredientQuantities | getIngredientQuantities()} method.
 * @category Types
 */
export interface GetIngredientQuantitiesOptions {
  /**
   * Filter ingredients to only those appearing in a specific section.
   * Can be a Section object or section index (0-based).
   */
  section?: Section | number;
  /**
   * Filter ingredients to only those appearing in a specific step.
   * Can be a Step object or step index (0-based within the section, or global if no section specified).
   */
  step?: Step | number;
  /**
   * The choices to apply when computing quantities.
   * If not provided, uses primary alternatives (index 0 for all).
   */
  choices?: RecipeChoices;
}

/**
 * Represents a cookware item in a recipe step.
 * @category Types
 */
export interface CookwareItem {
  /** The type of the item. */
  type: "cookware";
  /** The index of the cookware, within the {@link Recipe.cookware | list of cookware} */
  index: number;
  /** The quantity of this specific mention of the cookware */
  quantity?: FixedValue | Range;
}

/**
 * Represents a timer item in a recipe step.
 * @category Types
 */
export interface TimerItem {
  /** The type of the item. */
  type: "timer";
  /** The index of the timer, within the {@link Recipe.timers | list of timers} */
  index: number;
}

/**
 * Represents a timer in a recipe.
 * @category Types
 */
export interface Timer {
  /** The name of the timer. */
  name?: string;
  /** The duration of the timer. */
  duration: FixedValue | Range;
  /** The unit of the timer. */
  unit: string;
}

/**
 * Represents a text item in a recipe step.
 * @category Types
 */
export interface TextItem {
  /** The type of the item. */
  type: "text";
  /** The content of the text item. */
  value: string;
}

/**
 * Represents an arbitrary scalable quantity in a recipe.
 * @category Types
 */
export interface ArbitraryScalable {
  /** The name of the arbitrary scalable quantity. */
  name?: string;
  /** The numerical value of the arbitrary scalable quantity. */
  quantity: FixedNumericValue;
  /** The unit of the arbitrary scalable quantity. */
  unit?: string;
}

/**
 * Represents an arbitrary scalable quantity item in a recipe step.
 * @category Types
 */
export interface ArbitraryScalableItem {
  /** The type of the item. */
  type: "arbitrary";
  /** The index of the arbitrary scalable quantity, within the {@link Recipe.arbitraries | list of arbitrary scalable quantities} */
  index: number;
}

/**
 * Represents an item in a recipe step.
 * @category Types
 */
export type StepItem =
  | TextItem
  | IngredientItem
  | CookwareItem
  | TimerItem
  | ArbitraryScalableItem;

/**
 * Represents a step in a recipe.
 * @category Types
 */
export interface Step {
  type: "step";
  /** The items in the step. */
  items: StepItem[];
}

/**
 * Represents an item in a note (can be text or arbitrary scalable).
 * @category Types
 */
export type NoteItem = TextItem | ArbitraryScalableItem;

/**
 * Represents a note in a recipe.
 * @category Types
 */
export interface Note {
  type: "note";
  /** The items in the note. */
  items: NoteItem[];
}

/**
 * Represents a possible state modifier or other flag for cookware used in a recipe
 * @category Types
 */
export type CookwareFlag = "optional" | "hidden";

/**
 * Represents a piece of cookware in a recipe.
 * @category Types
 */
export interface Cookware {
  /** The name of the cookware. */
  name: string;
  /** The quantity of cookware */
  quantity?: FixedValue | Range;
  /** A list of potential state modifiers or other flags for the cookware */
  flags?: CookwareFlag[];
}

/**
 * Represents categorized ingredients.
 * @category Types
 */
export interface CategorizedIngredients {
  [category: string]: AddedIngredient[];
}

/**
 * Represents a recipe together with a scaling factor
 * @category Types
 */
export interface RecipeWithFactor {
  /** The recipe that was added. */
  recipe: Recipe;
  /** The factor the recipe is scaled by. */
  factor: number;
  /** The choices for alternative ingredients. */
  choices?: RecipeChoices;
}

/**
 * Represents a recipe together with a servings value for scaling
 * @category Types
 */
export interface RecipeWithServings {
  /** The recipe that was added. */
  recipe: Recipe;
  /** The servings the recipe is scaled to */
  servings: number;
  /** The choices for alternative ingredients. */
  choices?: RecipeChoices;
}

/**
 * Represents a recipe that has been added to a shopping list.
 * @category Types
 */
export type AddedRecipe = RecipeWithFactor | RecipeWithServings;

/**
 * Options for adding a recipe to a shopping list
 * @category Types
 */
export type AddedRecipeOptions = {
  /** The scaling option for the recipe. Can be either a factor or a number of servings */
  scaling?: { factor: number } | { servings: number };
  /** The choices for alternative ingredients. */
  choices?: RecipeChoices;
};

/**
 * Represents an ingredient that has been added to a shopping list
 * @category Types
 */
export type AddedIngredient = Pick<Ingredient, "name"> & {
  /** The total quantity of the ingredient after applying choices. */
  quantityTotal?:
    | QuantityWithPlainUnit
    | MaybeNestedGroup<QuantityWithPlainUnit>;
};

/**
 * Represents an ingredient in a category.
 * @category Types
 */
export interface CategoryIngredient {
  /** The name of the ingredient. */
  name: string;
  /** The aliases of the ingredient. */
  aliases: string[];
}

/**
 * Represents a category of ingredients.
 * @category Types
 */
export interface Category {
  /** The name of the category. */
  name: string;
  /** The ingredients in the category. */
  ingredients: CategoryIngredient[];
}

/**
 * Represents a single size expression for a product (value + optional unit)
 * @category Types
 */
export interface ProductSize {
  /** The numeric size value */
  size: FixedNumericValue;
  /** The unit of the size (optional) */
  unit?: string;
}

/**
 * Represents a normalized size expression for a product
 * @category Types
 */
export interface ProductSizeNormalized {
  /** The numeric size value (scaled to base unit) */
  size: FixedNumericValue;
  /** The resolved unit definition */
  unit: UnitDefinitionLike;
}

/**
 * Core properties for {@link ProductOption}
 * @category Types
 */
export interface ProductOptionCore {
  /** The ID of the product */
  id: string;
  /** The name of the product */
  productName: string;
  /** The name of the ingredient it corresponds to */
  ingredientName: string;
  /** The aliases of the ingredient it also corresponds to */
  ingredientAliases?: string[];
  /** The price of the product */
  price: number;
}

/**
 * Base type for {@link ProductOption} allowing arbitrary additional metadata
 * @category Types
 */
export type ProductOptionBase = ProductOptionCore & Record<string, unknown>;

/**
 * Represents a product option in a {@link ProductCatalog}
 * @category Types
 */
export type ProductOption = ProductOptionBase & {
  /** The size(s) of the product. Multiple sizes allow equivalent expressions (e.g., "1%dozen" and "12") */
  sizes: ProductSize[];
};

/**
 * Core properties for normalized product options
 * @category Types
 */
export interface ProductOptionNormalizedCore extends ProductOptionCore {
  /** The normalized size(s) of the product with resolved unit definitions */
  sizes: ProductSizeNormalized[];
}

/**
 * Represents a product option with normalized unit definitions
 * @category Types
 */
export type ProductOptionNormalized = ProductOptionNormalizedCore &
  Record<string, unknown>;

/**
 * Represents a product option as described in a catalog TOML file
 * @category Types
 */
export interface ProductOptionToml {
  /** The name of the product */
  name: string;
  /** The size and unit of the product separated by %. Can be an array for multiple equivalent sizes (e.g., ["1%dozen", "12"]) */
  size: string | string[];
  /** The price of the product */
  price: number;
  /** Arbitrary additional metadata */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Represents a product selection in a {@link ShoppingCart}
 * @category Types
 */
export interface ProductSelection {
  /** The selected product */
  product: ProductOption;
  /** The quantity of the selected product */
  quantity: number;
  /** The total price for this selected product */
  totalPrice: number;
}

/**
 * Represents the content of the actual cart of the {@link ShoppingCart}
 * @category Types
 */
export type CartContent = ProductSelection[];

/**
 * Represents a successful match between a ingredient and product(s) in the product catalog, in a {@link ShoppingCart}
 * @category Types
 */
export interface ProductMatch {
  ingredient: Ingredient;
  selection: ProductSelection[];
}

/**
 * Represents all successful matches between ingredients and the product catalog, in a {@link ShoppingCart}
 * @category Types
 */
export type CartMatch = ProductMatch[];

/**
 * Represents the error codes for an ingredient which didn't match with any product in the product catalog, in a {@link ShoppingCart}
 * @category Types
 */
export type NoProductMatchErrorCode =
  | "incompatibleUnits"
  | "textValue"
  | "textValue_incompatibleUnits"
  | "noProduct"
  | "noQuantity";

/**
 * Represents an ingredient which didn't match with any product in the product catalog, in a {@link ShoppingCart}
 * @category Types
 */
export interface ProductMisMatch {
  ingredient: Ingredient;
  reason: NoProductMatchErrorCode;
}

/**
 * Represents all ingredients which didn't match with any product in the product catalog, in a {@link ShoppingCart}
 * @category Types
 */
export type CartMisMatch = ProductMisMatch[];

/**
 * Represents the type category of a unit used for quantities
 * @category Types
 */
export type UnitType = "mass" | "volume" | "count" | "other";

/**
 * Represents the specific measurement systems
 * @category Types
 */
export type SpecificUnitSystem = "metric" | "US" | "UK" | "JP";

/**
 * Represents the measurement system a unit belongs to
 * @category Types
 */
export type UnitSystem = SpecificUnitSystem | "ambiguous";

/**
 * Conversion factors for ambiguous units that can belong to multiple systems.
 * Maps each possible system to its toBase conversion factor.
 * @category Types
 */
export type ToBaseBySystem = Partial<Record<SpecificUnitSystem, number>>;

/**
 * Represents a unit used to describe quantities
 * @category Types
 */
export interface Unit {
  name: string;
  /** This property is set to true when the unit is prefixed by an `=` sign in the cooklang file, e.g. `=g`
   * Indicates that quantities with this unit should be treated as integers only (no decimal/fractional values). */
  integerProtected?: boolean;
}

/**
 * Represents a fully defined unit with conversion and alias information
 * @category Types
 */
export interface UnitDefinition extends Unit {
  type: UnitType;
  system: UnitSystem;
  /** e.g. ['gram', 'grams'] */
  aliases: string[];
  /** Conversion factor to the base unit of its type (uses default system for ambiguous units) */
  toBase: number;
  /** For ambiguous units: conversion factors for each possible system */
  toBaseBySystem?: ToBaseBySystem;
}

/**
 * Represents a resolved unit definition or a lightweight placeholder for non-standard units
 * @category Types
 */
export type UnitDefinitionLike =
  | UnitDefinition
  | { name: string; type: "other"; system: "none"; integerProtected?: boolean };

/**
 * Core quantity container holding a fixed value or a range
 * @category Types
 */
export interface QuantityBase {
  quantity: FixedValue | Range;
}

/**
 * Represents a quantity with an optional plain (string) unit
 * @category Types
 */
export interface QuantityWithPlainUnit extends QuantityBase {
  unit?: string;
  /** Optional equivalent quantities in different units (for alternative units like `@flour{100%g|3.5%oz}`) */
  equivalents?: QuantityWithPlainUnit[];
}

/**
 * Represents a quantity with an optional extended `Unit` object
 * @category Types
 */
export interface QuantityWithExtendedUnit extends QuantityBase {
  unit?: Unit;
}

/**
 * Represents a quantity with a resolved unit definition
 * @category Types
 */
export interface QuantityWithUnitDef extends QuantityBase {
  unit: UnitDefinitionLike;
}

/**
 * Represents any quantity shape supported by the parser (plain, extended, or resolved unit)
 * @category Types
 */
export type QuantityWithUnitLike =
  | QuantityWithPlainUnit
  | QuantityWithExtendedUnit
  | QuantityWithUnitDef;

/**
 * Represents a flat "or" group of alternative quantities (for alternative units)
 * @category Types
 */
export interface FlatOrGroup<T = QuantityWithUnitLike> {
  or: T[];
}
/**
 * Represents an "or" group of alternative quantities that may contain nested groups (alternatives with nested structure)
 * @category Types
 */
export interface MaybeNestedOrGroup<T = QuantityWithUnitLike> {
  or: (T | MaybeNestedGroup<T>)[];
}

/**
 * Represents a flat "and" group of quantities (combined quantities)
 * @category Types
 */
export interface FlatAndGroup<T = QuantityWithUnitLike> {
  and: T[];
}

/**
 * Represents an "and" group of quantities that may contain nested groups (combinations with nested structure)
 * @category Types
 */
export interface MaybeNestedAndGroup<T = QuantityWithUnitLike> {
  and: (T | MaybeNestedGroup<T>)[];
}

/**
 * Represents any flat group type ("and" or "or")
 * @category Types
 */
export type FlatGroup<T = QuantityWithUnitLike> =
  | FlatAndGroup<T>
  | FlatOrGroup<T>;
/**
 * Represents any group type that may include nested groups
 * @category Types
 */
export type MaybeNestedGroup<T = QuantityWithUnitLike> =
  | MaybeNestedAndGroup<T>
  | MaybeNestedOrGroup<T>;
/**
 * Represents any group type (flat or nested)
 * @category Types
 */
export type Group<T = QuantityWithUnitLike> =
  | MaybeNestedGroup<T>
  | FlatGroup<T>;
/**
 * Represents any "or" group (flat or nested)
 * @category Types
 */
export type OrGroup<T = QuantityWithUnitLike> =
  | MaybeNestedOrGroup<T>
  | FlatOrGroup<T>;
/**
 * Represents any "and" group (flat or nested)
 * @category Types
 */
export type AndGroup<T = QuantityWithUnitLike> =
  | MaybeNestedAndGroup<T>
  | FlatAndGroup<T>;
