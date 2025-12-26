import type { Recipe } from "./classes/recipe";
import type {
  MaybeNestedGroup,
  QuantityWithExtendedUnit,
  QuantityWithPlainUnit,
} from "./units";

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
 * Represents an ingredient in a recipe.
 * @category Types
 */
export interface Ingredient {
  /** The name of the ingredient. */
  name: string;
  /** The total quantity of the ingredient in the recipe. */
  quantity?: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>;
  /** The preparation of the ingredient. */
  preparation?: string;
  /** The list of ingredients mentioned in the preparation as alternatives to this ingredient */
  alternatives?: Set<number>;
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
export interface IngredientItemQuantity {
  /**
   * A list of equivalent quantities for this ingredient mention.
   * The first item is considered the primary quantity.
   * For `@salt{1%tsp|5%g}`, this would contain two `Quantity` objects.
   */
  equivalents: QuantityWithExtendedUnit[];
  /** Indicates whether this quantity should be scaled when the recipe serving size changes. */
  scalable: boolean;
}

/**
 * Represents a single ingredient choice within an `IngredientItem`. It points
 * to a specific ingredient and its corresponding quantity information.
 * @category Types
 */
export interface IngredientAlternative {
  /** The index of the ingredient within the {@link Recipe.ingredients} array. */
  index: number;
  /** The quantity of this specific mention of the ingredient */
  quantity?: IngredientItemQuantity;
  /** The alias/name of the ingredient as it should be displayed for this occurrence. */
  displayName: string;
  /** An optional note for this specific choice (e.g., "for a vegan version"). */
  note?: string;
  /** When used in the {@link Recipe.choices} property, the id of the corresponding ingredient item */
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
 * Represents the available alternatives for an ingredient mention together with the
 * current active choice.
 * @category Types
 */
export interface IngredientChoiceInline {
  alternatives: IngredientAlternative[];
  active: number;
}

/**
 * Represents the available alternatives for a group of ingredient mentions together
 * with the current active choice.
 * @category Types
 */
export interface IngredientChoiceGrouped {
  alternatives: IngredientAlternative[];
  active: number;
}

/**
 * Represents the choices one can make in a recipe
 * @category Types
 */
export interface RecipeChoices {
  /** Map of choices that can be made at Ingredient Item level */
  ingredientItems: Map<string, IngredientChoiceInline>;
  /** Map of choices that can be made for Grouped Ingredient Item's */
  ingredientGroups: Map<string, IngredientChoiceGrouped>;
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
  [category: string]: Ingredient[];
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
}

/**
 * Represents a recipe that has been added to a shopping list.
 * @category Types
 */
export type AddedRecipe = RecipeWithFactor | RecipeWithServings;

/**
 * Represents an ingredient that has been added to a shopping list
 * @category Types
 */
export type AddedIngredient = Pick<Ingredient, "name"> & QuantityWithPlainUnit;

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
 * Represents a product option in a {@link ProductCatalog}
 * @category Types
 */
export interface ProductOption {
  /** The ID of the product */
  id: string;
  /** The name of the product */
  productName: string;
  /** The name of the ingredient it corresponds to */
  ingredientName: string;
  /** The aliases of the ingredient it also corresponds to */
  ingredientAliases?: string[];
  /** The size of the product. */
  size: FixedNumericValue;
  /** The unit of the product size. */
  unit?: string;
  /** The price of the product */
  price: number;
  /** Arbitrary additional metadata */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Represents a product option as described in a catalog TOML file
 * @category Types
 */
export interface ProductOptionToml {
  /** The name of the product */
  name: string;
  /** The size and unit of the product separated by % */
  size: string;
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
  | "noProduct"
  | "textValue"
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
