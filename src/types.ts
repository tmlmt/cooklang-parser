import type { Recipe } from "./classes/recipe";
import type { Quantity } from "./units";

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
   * is `servings` > `yield` > `serves`.
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
   * is `servings` > `yield` > `serves`. See {@link Metadata.servings | servings}
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
   * is `servings` > `yield` > `serves`. See {@link Metadata.servings | servings}
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
}

/**
 * Represents a quantity described by text, e.g. "a pinch"
 * @category Types
 */
export interface TextValue {
  type: "text";
  value: string;
}

/**
 * Represents a quantity described by a decimal number, e.g. "1.5"
 * @category Types
 */
export interface DecimalValue {
  type: "decimal";
  value: number;
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
 * Represents a range of quantities, e.g. "1-2"
 * @category Types
 */
export interface Range {
  type: "range";
  min: DecimalValue | FractionValue;
  max: DecimalValue | FractionValue;
}

/**
 * Represents a contributor to an ingredient's total quantity
 * @category Types
 */
export interface QuantityPart extends Quantity {
  scalable: boolean;
}

/**
 * Represents an ingredient in a recipe.
 * @category Types
 */
export interface Ingredient {
  /** The name of the ingredient. */
  name: string;
  /** The quantity of the ingredient. */
  quantity?: FixedValue | Range;
  /** The unit of the ingredient. */
  unit?: string;
  /** The array of contributors to the ingredient's total quantity. */
  quantityParts?: QuantityPart[];
  /** The preparation of the ingredient. */
  preparation?: string;
  /** Whether the ingredient is optional. */
  optional?: boolean;
  /** Whether the ingredient is hidden. */
  hidden?: boolean;
  /** Whether the ingredient is a recipe. */
  isRecipe?: boolean;
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
  /** The value of the item. */
  value: string;
}

/**
 * Represents an ingredient item in a recipe step.
 * @category Types
 */
export interface IngredientItem {
  /** The type of the item. */
  type: "ingredient";
  /** The index of this item i.e. of this ingredient, within the list of ingredients */
  index: number;
  /** Index of the ingredient quantity part corresponding to this item i.e. this occurence
   * of the ingredient which may be referenced elsewhere. */
  quantityPartIndex?: number;
  /** The alias/name of the ingredient as it should be displayed in the preparation
   * for this occurence */
  displayName: string;
}

/**
 * Represents a cookware item in a recipe step.
 * @category Types
 */
export interface CookwareItem {
  /** The type of the item. */
  type: "cookware";
  /** The value of the item. */
  value: number;
  /** Quantity specific to this step item for this cookware which may also be referenced elsewhere */
  itemQuantity?: FixedValue | Range;
}

/**
 * Represents a timer item in a recipe step.
 * @category Types
 */
export interface TimerItem {
  /** The type of the item. */
  type: "timer";
  /** The value of the item. */
  value: number;
}

/**
 * Represents an item in a recipe step.
 * @category Types
 */
export type Item = TextItem | IngredientItem | CookwareItem | TimerItem;

/**
 * Represents a step in a recipe.
 * @category Types
 */
export interface Step {
  type: "step";
  /** The items in the step. */
  items: Item[];
}

/**
 * Represents a note in a recipe.
 * @category Types
 */
export interface Note {
  type: "note";
  /** The content of the note. */
  note: string;
}

/**
 * Represents a piece of cookware in a recipe.
 * @category Types
 */
export interface Cookware {
  /** The name of the cookware. */
  name: string;
  /** The quantity of cookware */
  quantity?: FixedValue | Range;
  /** Whether the cookware is optional. */
  optional?: boolean;
  /** Whether the cookware is hidden. */
  hidden?: boolean;
}

/**
 * Represents categorized ingredients.
 * @category Types
 */
export interface CategorizedIngredients {
  [category: string]: Ingredient[];
}

/**
 * Represents a recipe that has been added to a shopping list.
 * @category Types
 */
export interface AddedRecipe {
  /** The recipe that was added. */
  recipe: Recipe;
  /** The factor the recipe was scaled by. */
  factor: number;
}

/**
 * Represents an ingredient that has been added to a shopping list
 * @category Types
 */
export type AddedIngredient = Pick<Ingredient, "name" | "quantity" | "unit">;

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
