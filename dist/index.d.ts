declare class Section {
    name: string;
    content: (Step | Note)[];
    constructor(name?: string);
    isBlank(): boolean;
}

/**
 * Represents a recipe.
 * @category Classes
 */
declare class Recipe {
    /**
     * The recipe's metadata.
     * @see {@link Metadata}
     */
    metadata: Metadata;
    /**
     * The recipe's ingredients.
     * @see {@link Ingredient}
     */
    ingredients: Ingredient[];
    /**
     * The recipe's sections.
     * @see {@link Section}
     */
    sections: Section[];
    /**
     * The recipe's cookware.
     * @see {@link Cookware}
     */
    cookware: Cookware[];
    /**
     * The recipe's timers.
     * @see {@link Timer}
     */
    timers: Timer[];
    /**
     * The recipe's servings. Used for scaling
     */
    servings?: number;
    /**
     * Creates a new Recipe instance.
     * @param content - The recipe content to parse.
     */
    constructor(content?: string);
    /**
     * Parses a recipe from a string.
     * @param content - The recipe content to parse.
     */
    parse(content: string): void;
    /**
     * Scales the recipe to a new number of servings.
     * @param newServings - The new number of servings.
     * @returns A new Recipe instance with the scaled ingredients.
     */
    scaleTo(newServings: number): Recipe;
    /**
     * Scales the recipe by a factor.
     * @param factor - The factor to scale the recipe by.
     * @returns A new Recipe instance with the scaled ingredients.
     */
    scaleBy(factor: number): Recipe;
    private getServings;
    /**
     * Clones the recipe.
     * @returns A new Recipe instance with the same properties.
     */
    clone(): Recipe;
}

/**
 * Represents the metadata of a recipe.
 * @category Types
 */
interface Metadata {
    /** The title of the recipe. */
    title?: string;
    /** The tags of the recipe. */
    tags?: string[];
    /** The source of the recipe. */
    source?: string;
    /** The author of the recipe. */
    author?: string;
    /** The number of servings the recipe makes.
     * Complex info can be given, as long as the first part before a comma has a numerical value, which will be used for scaling
     * Interchangeable with `yield` or `serves`. If multiple ones are defined, the latest one will be used for scaling */
    servings?: string;
    /** The yield of the recipe.
     *  Complex info can be given, as long as the first part before a comma has a numerical value, which will be used for scaling
     *  Interchangeable with `servings` or `serves`. If multiple ones are defined, the latest one will be used for scaling
     */
    yield?: string;
    /** The number of people the recipe serves.
     *  Complex info can be given, as long as the first part before a comma has a numerical value, which will be used for scaling
     *  Interchangeable with `servings` or `yield`. If multiple ones are defined, the latest one will be used for scaling
     */
    serves?: string;
    /** The course of the recipe. */
    course?: string;
    /** The category of the recipe. */
    category?: string;
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
    time?: string;
    duration?: string;
    /** The difficulty of the recipe. */
    difficulty?: string;
    /** The cuisine of the recipe. */
    cuisine?: string;
    /** The diet of the recipe. */
    diet?: string;
    /** The description of the recipe. */
    description?: string;
    /** The images of the recipe. */
    images?: string[];
}
/**
 * Represents the extracted metadata from a recipe.
 * @category Types
 */
interface MetadataExtract {
    /** The metadata of the recipe. */
    metadata: Metadata;
    /** The number of servings the recipe makes. Used for scaling */
    servings?: number;
}
/**
 * Represents an ingredient in a recipe.
 * @category Types
 */
interface Ingredient {
    /** The name of the ingredient. */
    name: string;
    /** The quantity of the ingredient. */
    quantity?: number | string;
    /** The unit of the ingredient. */
    unit?: string;
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
interface Timer {
    /** The name of the timer. */
    name?: string;
    /** The duration of the timer. */
    duration: number;
    /** The unit of the timer. */
    unit: string;
}
/**
 * Represents a text item in a recipe step.
 * @category Types
 */
interface TextItem {
    /** The type of the item. */
    type: "text";
    /** The value of the item. */
    value: string;
}
/**
 * Represents an ingredient item in a recipe step.
 * @category Types
 */
interface IngredientItem {
    /** The type of the item. */
    type: "ingredient";
    /** The value of the item. */
    value: number;
}
/**
 * Represents a cookware item in a recipe step.
 * @category Types
 */
interface CookwareItem {
    /** The type of the item. */
    type: "cookware";
    /** The value of the item. */
    value: number;
}
/**
 * Represents a timer item in a recipe step.
 * @category Types
 */
interface TimerItem {
    /** The type of the item. */
    type: "timer";
    /** The value of the item. */
    value: number;
}
/**
 * Represents an item in a recipe step.
 * @category Types
 */
type Item = TextItem | IngredientItem | CookwareItem | TimerItem;
/**
 * Represents a step in a recipe.
 * @category Types
 */
interface Step {
    /** The items in the step. */
    items: Item[];
}
/**
 * Represents a note in a recipe.
 * @category Types
 */
interface Note {
    /** The content of the note. */
    note: string;
}
/**
 * Represents a piece of cookware in a recipe.
 * @category Types
 */
interface Cookware {
    /** The name of the cookware. */
    name: string;
    /** Whether the cookware is optional. */
    optional?: boolean;
    /** Whether the cookware is hidden. */
    hidden?: boolean;
}
/**
 * Represents categorized ingredients.
 * @category Types
 */
interface CategorizedIngredients {
    /** The category of the ingredients. */
    [category: string]: Ingredient[];
}
/**
 * Represents a recipe that has been added to a shopping list.
 * @category Types
 */
interface AddedRecipe {
    /** The recipe that was added. */
    recipe: Recipe;
    /** The factor the recipe was scaled by. */
    factor: number;
}
/**
 * Represents an ingredient in an aisle.
 * @category Types
 */
interface AisleIngredient {
    /** The name of the ingredient. */
    name: string;
    /** The aliases of the ingredient. */
    aliases: string[];
}
/**
 * Represents a category of aisles.
 * @category Types
 */
interface AisleCategory {
    /** The name of the category. */
    name: string;
    /** The ingredients in the category. */
    ingredients: AisleIngredient[];
}

/**
 * Represents the aisle configuration for a shopping list.
 * @category Classes
 */
declare class AisleConfig {
    /**
     * The categories of aisles.
     * @see {@link AisleCategory}
     */
    categories: AisleCategory[];
    /**
     * Creates a new AisleConfig instance.
     * @param config - The aisle configuration to parse.
     */
    constructor(config?: string);
    /**
     * Parses an aisle configuration from a string.
     * @param config - The aisle configuration to parse.
     */
    parse(config: string): void;
}

/**
 * Represents a shopping list.
 * @category Classes
 */
declare class ShoppingList {
    /**
     * The ingredients in the shopping list.
     * @see {@link Ingredient}
     */
    ingredients: Ingredient[];
    /**
     * The recipes in the shopping list.
     * @see {@link AddedRecipe}
     */
    recipes: AddedRecipe[];
    /**
     * The aisle configuration for the shopping list.
     * @see {@link AisleConfig}
     */
    aisle_config?: AisleConfig;
    /**
     * The categorized ingredients in the shopping list.
     * @see {@link CategorizedIngredients}
     */
    categories?: CategorizedIngredients;
    /**
     * Creates a new ShoppingList instance.
     * @param aisle_config_str - The aisle configuration to parse.
     */
    constructor(aisle_config_str?: string);
    private calculate_ingredients;
    /**
     * Adds a recipe to the shopping list.
     * @param recipe - The recipe to add.
     * @param factor - The factor to scale the recipe by.
     */
    add_recipe(recipe: Recipe, factor?: number): void;
    /**
     * Removes a recipe from the shopping list.
     * @param index - The index of the recipe to remove.
     */
    remove_recipe(index: number): void;
    /**
     * Sets the aisle configuration for the shopping list.
     * @param config - The aisle configuration to parse.
     */
    set_aisle_config(config: string): void;
    /**
     * Categorizes the ingredients in the shopping list
     * Will use the aisle config if any, otherwise all ingredients will be placed in the "other" category
     */
    categorize(): void;
}

export { type AddedRecipe, type AisleCategory, AisleConfig, type AisleIngredient, type CategorizedIngredients, type Cookware, type CookwareItem, type Ingredient, type IngredientItem, type Item, type Metadata, type MetadataExtract, type Note, Recipe, ShoppingList, type Step, type TextItem, type Timer, type TimerItem };
