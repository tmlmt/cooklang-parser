var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/classes/aisle_config.ts
var AisleConfig = class {
  /**
   * Creates a new AisleConfig instance.
   * @param config - The aisle configuration to parse.
   */
  constructor(config) {
    /**
     * The categories of aisles.
     * @see {@link AisleCategory}
     */
    __publicField(this, "categories", []);
    if (config) {
      this.parse(config);
    }
  }
  /**
   * Parses an aisle configuration from a string.
   * @param config - The aisle configuration to parse.
   */
  parse(config) {
    let currentCategory = null;
    const categoryNames = /* @__PURE__ */ new Set();
    const ingredientNames = /* @__PURE__ */ new Set();
    for (const line of config.split("\n")) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        continue;
      }
      if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
        const categoryName = trimmedLine.substring(1, trimmedLine.length - 1).trim();
        if (categoryNames.has(categoryName)) {
          throw new Error(`Duplicate category found: ${categoryName}`);
        }
        categoryNames.add(categoryName);
        currentCategory = { name: categoryName, ingredients: [] };
        this.categories.push(currentCategory);
      } else {
        if (currentCategory === null) {
          throw new Error(
            `Ingredient found without a category: ${trimmedLine}`
          );
        }
        const aliases = trimmedLine.split("|").map((s) => s.trim());
        for (const alias of aliases) {
          if (ingredientNames.has(alias)) {
            throw new Error(`Duplicate ingredient/alias found: ${alias}`);
          }
          ingredientNames.add(alias);
        }
        const ingredient = {
          name: aliases[0],
          // We know this exists because trimmedLine is not empty
          aliases
        };
        currentCategory.ingredients.push(ingredient);
      }
    }
  }
};

// src/classes/section.ts
var Section = class {
  constructor(name = "") {
    __publicField(this, "name");
    __publicField(this, "content", []);
    this.name = name;
  }
  isBlank() {
    return this.name === "" && this.content.length === 0;
  }
};

// src/regex.ts
var metadataRegex = /---\n(.*?)\n---/s;
var multiwordIngredient = /@(?<mIngredientModifier>[@\-&+*!?])?(?<mIngredientName>(?:[^\s@#~\[\]{(.,;:!?]+(?:\s+[^\s@#~\[\]{(.,;:!?]+)+))(?=\s*(?:\{|\}|\(\s*[^)]*\s*\)))(?:\{(?<mIngredientQuantity>\p{No}|(?:\p{Nd}+(?:[.,\/][\p{Nd}]+)?))?(?:%(?<mIngredientUnits>[^}]+?))?\})?(?:\((?<mIngredientPreparation>[^)]*?)\))?/gu;
var singleWordIngredient = /@(?<sIngredientModifier>[@\-&+*!?])?(?<sIngredientName>[^\s@#~\[\]{(.,;:!?]+)(?:\{(?<sIngredientQuantity>\p{No}|(?:\p{Nd}+(?:[.,\/][\p{Nd}]+)?))(?:%(?<sIngredientUnits>[^}]+?))?\})?(?:\((?<sIngredientPreparation>[^)]*?)\))?/gu;
var multiwordCookware = /#(?<mCookwareModifier>[\-&+*!?])?(?<mCookwareName>[^#~[]+?)\{(?<mCookwareQuantity>.*?)\}/;
var singleWordCookware = /#(?<sCookwareModifier>[\-&+*!?])?(?<sCookwareName>[^\s\t\s\p{P}]+)/u;
var timer = /~(?<timerName>.*?)(?:\{(?<timerQuantity>.*?)(?:%(?<timerUnits>.+?))?\})/;
var tokensRegex = new RegExp(
  [
    multiwordIngredient,
    singleWordIngredient,
    multiwordCookware,
    singleWordCookware,
    timer
  ].map((r) => r.source).join("|"),
  "gu"
);
var commentRegex = /--.*/g;
var blockCommentRegex = /\s*\[\-.*?\-\]\s*/g;

// src/units.ts
var units = [
  // Mass (Metric)
  {
    name: "g",
    type: "mass",
    system: "metric",
    aliases: ["gram", "grams"],
    toBase: 1
  },
  {
    name: "kg",
    type: "mass",
    system: "metric",
    aliases: ["kilogram", "kilograms"],
    toBase: 1e3
  },
  // Mass (Imperial)
  {
    name: "oz",
    type: "mass",
    system: "imperial",
    aliases: ["ounce", "ounces"],
    toBase: 28.3495
  },
  {
    name: "lb",
    type: "mass",
    system: "imperial",
    aliases: ["pound", "pounds"],
    toBase: 453.592
  },
  // Volume (Metric)
  {
    name: "ml",
    type: "volume",
    system: "metric",
    aliases: ["milliliter", "milliliters", "millilitre", "millilitres"],
    toBase: 1
  },
  {
    name: "l",
    type: "volume",
    system: "metric",
    aliases: ["liter", "liters", "litre", "litres"],
    toBase: 1e3
  },
  {
    name: "tsp",
    type: "volume",
    system: "metric",
    aliases: ["teaspoon", "teaspoons"],
    toBase: 5
  },
  {
    name: "tbsp",
    type: "volume",
    system: "metric",
    aliases: ["tablespoon", "tablespoons"],
    toBase: 15
  },
  // Volume (Imperial)
  {
    name: "fl-oz",
    type: "volume",
    system: "imperial",
    aliases: ["fluid ounce", "fluid ounces"],
    toBase: 29.5735
  },
  {
    name: "cup",
    type: "volume",
    system: "imperial",
    aliases: ["cups"],
    toBase: 236.588
  },
  {
    name: "pint",
    type: "volume",
    system: "imperial",
    aliases: ["pints"],
    toBase: 473.176
  },
  {
    name: "quart",
    type: "volume",
    system: "imperial",
    aliases: ["quarts"],
    toBase: 946.353
  },
  {
    name: "gallon",
    type: "volume",
    system: "imperial",
    aliases: ["gallons"],
    toBase: 3785.41
  },
  // Count units (no conversion, but recognized as a type)
  {
    name: "piece",
    type: "count",
    system: "metric",
    aliases: ["pieces"],
    toBase: 1
  }
];
var unitMap = /* @__PURE__ */ new Map();
for (const unit of units) {
  unitMap.set(unit.name.toLowerCase(), unit);
  for (const alias of unit.aliases) {
    unitMap.set(alias.toLowerCase(), unit);
  }
}
function normalizeUnit(unit) {
  return unitMap.get(unit.toLowerCase().trim());
}
function addQuantities(q1, q2) {
  const unit1Def = normalizeUnit(q1.unit);
  const unit2Def = normalizeUnit(q2.unit);
  if (isNaN(Number(q1.value))) {
    throw new Error(
      `Cannot add quantity to string-quantified value: ${q1.value}`
    );
  }
  if (isNaN(Number(q2.value))) {
    throw new Error(
      `Cannot add quantity to string-quantified value: ${q2.value}`
    );
  }
  if (q1.unit === "" && unit2Def) {
    return {
      value: Math.round((q1.value + q2.value) * 100) / 100,
      unit: q2.unit
    };
  }
  if (q2.unit === "" && unit1Def) {
    return {
      value: Math.round((q1.value + q2.value) * 100) / 100,
      unit: q1.unit
    };
  }
  if (q1.unit.toLowerCase() === q2.unit.toLowerCase()) {
    return {
      value: Math.round((q1.value + q2.value) * 100) / 100,
      unit: q1.unit
    };
  }
  if (unit1Def && unit2Def) {
    if (unit1Def.type !== unit2Def.type) {
      throw new Error(
        `Cannot add quantities of different types: ${unit1Def.type} (${q1.unit}) and ${unit2Def.type} (${q2.unit})`
      );
    }
    const baseValue1 = q1.value * unit1Def.toBase;
    const baseValue2 = q2.value * unit2Def.toBase;
    const totalBaseValue = baseValue1 + baseValue2;
    let targetUnitDef;
    if (unit1Def.system !== unit2Def.system) {
      const metricUnitDef = unit1Def.system === "metric" ? unit1Def : unit2Def;
      targetUnitDef = units.filter((u) => u.type === metricUnitDef.type && u.system === "metric").reduce(
        (prev, current) => prev.toBase > current.toBase ? prev : current
      );
    } else {
      targetUnitDef = unit1Def.toBase >= unit2Def.toBase ? unit1Def : unit2Def;
    }
    const finalValue = totalBaseValue / targetUnitDef.toBase;
    return {
      value: Math.round(finalValue * 100) / 100,
      unit: targetUnitDef.name
    };
  }
  throw new Error(
    `Cannot add quantities with incompatible or unknown units: ${q1.unit} and ${q2.unit}`
  );
}

// src/parser_helpers.ts
function findOrPush(list, finder, creator) {
  let index = list.findIndex(finder);
  if (index === -1) {
    index = list.push(creator()) - 1;
  }
  return index;
}
function flushPendingNote(section, note) {
  if (note.length > 0) {
    section.content.push({ note });
    return "";
  }
  return note;
}
function flushPendingItems(section, items) {
  if (items.length > 0) {
    section.content.push({ items: [...items] });
    items.length = 0;
    return true;
  }
  return false;
}
function findAndUpsertIngredient(ingredients, newIngredient, isReference) {
  const { name, quantity, unit } = newIngredient;
  if (isReference) {
    const index = ingredients.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    if (index === -1) {
      throw new Error(
        `Referenced ingredient "${name}" not found. A referenced ingredient must be declared before being referenced with '&'.`
      );
    }
    const existingIngredient = ingredients[index];
    if (quantity !== void 0) {
      const currentQuantity = {
        value: existingIngredient.quantity ?? 0,
        unit: existingIngredient.unit ?? ""
      };
      const newQuantity = { value: quantity, unit: unit ?? "" };
      const total = addQuantities(currentQuantity, newQuantity);
      existingIngredient.quantity = total.value;
      existingIngredient.unit = total.unit || void 0;
    }
    return index;
  }
  return ingredients.push(newIngredient) - 1;
}
function findAndUpsertCookware(cookware, newCookware, isReference) {
  const { name } = newCookware;
  if (isReference) {
    const index = cookware.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    if (index === -1) {
      throw new Error(
        `Referenced cookware "${name}" not found. A referenced cookware must be declared before being referenced with '&'.`
      );
    }
    return index;
  }
  return cookware.push(newCookware) - 1;
}
function parseNumber(input_str) {
  const clean_str = String(input_str).replace(",", ".");
  if (!clean_str.startsWith("/") && clean_str.includes("/")) {
    const [num, den] = clean_str.split("/").map(Number);
    return num / den;
  }
  return Number(clean_str);
}
function parseSimpleMetaVar(content, varName) {
  const varMatch = content.match(
    new RegExp(`^${varName}:\\s*(.*(?:\\r?\\n\\s+.*)*)+`, "m")
  );
  return varMatch ? varMatch[1]?.trim().replace(/\s*\r?\n\s+/g, " ") : void 0;
}
function parseScalingMetaVar(content, varName) {
  const varMatch = content.match(
    new RegExp(`^${varName}:[\\t ]*(([^,\\n]*),? ?(?:.*)?)`, "m")
  );
  if (!varMatch) return void 0;
  if (isNaN(Number(varMatch[2]?.trim()))) {
    throw new Error("Scaling variables should be numbers");
  }
  return [Number(varMatch[2]?.trim()), varMatch[1]?.trim()];
}
function parseListMetaVar(content, varName) {
  const listMatch = content.match(
    new RegExp(
      `^${varName}:\\s*(?:\\[([^\\]]*)\\]|((?:\\r?\\n\\s*-\\s*.+)+))`,
      "m"
    )
  );
  if (!listMatch) return void 0;
  if (listMatch[1] !== void 0) {
    return listMatch[1].split(",").map((tag) => tag.trim());
  } else if (listMatch[2]) {
    return listMatch[2].split("\n").filter((line) => line.trim() !== "").map((line) => line.replace(/^\s*-\s*/, "").trim());
  }
}
function extractMetadata(content) {
  const metadata = {};
  let servings = void 0;
  const metadataContent = content.match(metadataRegex)?.[1];
  if (!metadataContent) {
    return { metadata };
  }
  for (const metaVar of [
    "title",
    "source",
    "source.name",
    "source.url",
    "author",
    "source.author",
    "prep time",
    "time.prep",
    "cook time",
    "time.cook",
    "time required",
    "time",
    "duration",
    "locale",
    "introduction",
    "description",
    "course",
    "category",
    "diet",
    "cuisine",
    "difficulty",
    "image",
    "picture"
  ]) {
    const stringMetaValue = parseSimpleMetaVar(metadataContent, metaVar);
    if (stringMetaValue) metadata[metaVar] = stringMetaValue;
  }
  for (const metaVar of ["servings", "yield", "serves"]) {
    const scalingMetaValue = parseScalingMetaVar(metadataContent, metaVar);
    if (scalingMetaValue && scalingMetaValue[1]) {
      metadata[metaVar] = scalingMetaValue[1];
      servings = scalingMetaValue[0];
    }
  }
  for (const metaVar of ["tags", "images", "pictures"]) {
    const listMetaValue = parseListMetaVar(metadataContent, metaVar);
    if (listMetaValue) metadata[metaVar] = listMetaValue;
  }
  return { metadata, servings };
}

// src/classes/recipe.ts
var Recipe = class _Recipe {
  /**
   * Creates a new Recipe instance.
   * @param content - The recipe content to parse.
   */
  constructor(content) {
    /**
     * The recipe's metadata.
     * @see {@link Metadata}
     */
    __publicField(this, "metadata", {});
    /**
     * The recipe's ingredients.
     * @see {@link Ingredient}
     */
    __publicField(this, "ingredients", []);
    /**
     * The recipe's sections.
     * @see {@link Section}
     */
    __publicField(this, "sections", []);
    /**
     * The recipe's cookware.
     * @see {@link Cookware}
     */
    __publicField(this, "cookware", []);
    /**
     * The recipe's timers.
     * @see {@link Timer}
     */
    __publicField(this, "timers", []);
    /**
     * The recipe's servings. Used for scaling
     */
    __publicField(this, "servings");
    if (content) {
      this.parse(content);
    }
  }
  /**
   * Parses a recipe from a string.
   * @param content - The recipe content to parse.
   */
  parse(content) {
    const cleanContent = content.replace(metadataRegex, "").replace(commentRegex, "").replace(blockCommentRegex, "").trim().split(/\r\n?|\n/);
    const { metadata, servings } = extractMetadata(content);
    this.metadata = metadata;
    this.servings = servings;
    let blankLineBefore = true;
    let section = new Section();
    const items = [];
    let note = "";
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
        const groups = match.groups;
        if (groups.mIngredientName || groups.sIngredientName) {
          const name = groups.mIngredientName || groups.sIngredientName;
          const quantityRaw = groups.mIngredientQuantity || groups.sIngredientQuantity;
          const units2 = groups.mIngredientUnits || groups.sIngredientUnits;
          const preparation = groups.mIngredientPreparation || groups.sIngredientPreparation;
          const modifier = groups.mIngredientModifier || groups.sIngredientModifier;
          const optional = modifier === "?";
          const hidden = modifier === "-";
          const reference = modifier === "&";
          const isRecipe = modifier === "@";
          const quantity = quantityRaw ? parseNumber(quantityRaw) : void 0;
          const idxInList = findAndUpsertIngredient(
            this.ingredients,
            {
              name,
              quantity,
              unit: units2,
              optional,
              hidden,
              preparation,
              isRecipe
            },
            reference
          );
          items.push({ type: "ingredient", value: idxInList });
        } else if (groups.mCookwareName || groups.sCookwareName) {
          const name = groups.mCookwareName || groups.sCookwareName;
          const modifier = groups.mCookwareModifier || groups.sCookwareModifier;
          const optional = modifier === "?";
          const hidden = modifier === "-";
          const reference = modifier === "&";
          const idxInList = findAndUpsertCookware(
            this.cookware,
            { name, optional, hidden },
            reference
          );
          items.push({ type: "cookware", value: idxInList });
        } else if (groups.timerQuantity !== void 0) {
          const durationStr = groups.timerQuantity.trim();
          const unit = (groups.timerUnits || "").trim();
          if (!unit) {
            throw new Error("Timer missing units");
          }
          const name = groups.timerName || void 0;
          const duration = parseNumber(durationStr);
          const timerObj = {
            name,
            duration,
            unit
          };
          const idxInList = findOrPush(
            this.timers,
            (t) => t.name === timerObj.name && t.duration === timerObj.duration && t.unit === timerObj.unit,
            () => timerObj
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
  scaleTo(newServings) {
    const originalServings = this.getServings();
    if (originalServings === void 0 || originalServings === 0) {
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
  scaleBy(factor) {
    const newRecipe = this.clone();
    const originalServings = newRecipe.getServings();
    if (originalServings === void 0 || originalServings === 0) {
      throw new Error("Error scaling recipe: no initial servings value set");
    }
    newRecipe.ingredients = newRecipe.ingredients.map((ingredient) => {
      if (ingredient.quantity && !isNaN(Number(ingredient.quantity))) {
        ingredient.quantity *= factor;
      }
      return ingredient;
    }).filter((ingredient) => ingredient.quantity !== null);
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
  getServings() {
    if (this.servings) {
      return this.servings;
    }
    return void 0;
  }
  /**
   * Clones the recipe.
   * @returns A new Recipe instance with the same properties.
   */
  clone() {
    const newRecipe = new _Recipe();
    newRecipe.metadata = JSON.parse(JSON.stringify(this.metadata));
    newRecipe.ingredients = JSON.parse(JSON.stringify(this.ingredients));
    newRecipe.sections = JSON.parse(JSON.stringify(this.sections));
    newRecipe.cookware = JSON.parse(JSON.stringify(this.cookware));
    newRecipe.timers = JSON.parse(JSON.stringify(this.timers));
    newRecipe.servings = this.servings;
    return newRecipe;
  }
};

// src/classes/shopping_list.ts
var ShoppingList = class {
  /**
   * Creates a new ShoppingList instance.
   * @param aisle_config_str - The aisle configuration to parse.
   */
  constructor(aisle_config_str) {
    /**
     * The ingredients in the shopping list.
     * @see {@link Ingredient}
     */
    __publicField(this, "ingredients", []);
    /**
     * The recipes in the shopping list.
     * @see {@link AddedRecipe}
     */
    __publicField(this, "recipes", []);
    /**
     * The aisle configuration for the shopping list.
     * @see {@link AisleConfig}
     */
    __publicField(this, "aisle_config");
    /**
     * The categorized ingredients in the shopping list.
     * @see {@link CategorizedIngredients}
     */
    __publicField(this, "categories");
    if (aisle_config_str) {
      this.set_aisle_config(aisle_config_str);
    }
  }
  calculate_ingredients() {
    this.ingredients = [];
    for (const { recipe, factor } of this.recipes) {
      const scaledRecipe = factor === 1 ? recipe : recipe.scaleBy(factor);
      for (const ingredient of scaledRecipe.ingredients) {
        if (ingredient.hidden) {
          continue;
        }
        const existingIngredient = this.ingredients.find(
          (i) => i.name === ingredient.name
        );
        let addSeparate = false;
        try {
          if (existingIngredient) {
            if (existingIngredient.quantity && ingredient.quantity) {
              const newQuantity = addQuantities(
                {
                  value: existingIngredient.quantity,
                  unit: existingIngredient.unit ?? ""
                },
                {
                  value: ingredient.quantity,
                  unit: ingredient.unit ?? ""
                }
              );
              existingIngredient.quantity = newQuantity.value;
              if (newQuantity.unit) {
                existingIngredient.unit = newQuantity.unit;
              }
            } else if (ingredient.quantity) {
              existingIngredient.quantity = ingredient.quantity;
              if (ingredient.unit) {
                existingIngredient.unit = ingredient.unit;
              }
            }
          }
        } catch {
          addSeparate = true;
        }
        if (!existingIngredient || addSeparate) {
          const newIngredient = { name: ingredient.name };
          if (ingredient.quantity) {
            newIngredient.quantity = ingredient.quantity;
          }
          if (ingredient.unit) {
            newIngredient.unit = ingredient.unit;
          }
          this.ingredients.push(newIngredient);
        }
      }
    }
  }
  /**
   * Adds a recipe to the shopping list.
   * @param recipe - The recipe to add.
   * @param factor - The factor to scale the recipe by.
   */
  add_recipe(recipe, factor = 1) {
    this.recipes.push({ recipe, factor });
    this.calculate_ingredients();
    this.categorize();
  }
  /**
   * Removes a recipe from the shopping list.
   * @param index - The index of the recipe to remove.
   */
  remove_recipe(index) {
    if (index < 0 || index >= this.recipes.length) {
      throw new Error("Index out of bounds");
    }
    this.recipes.splice(index, 1);
    this.calculate_ingredients();
    this.categorize();
  }
  /**
   * Sets the aisle configuration for the shopping list.
   * @param config - The aisle configuration to parse.
   */
  set_aisle_config(config) {
    this.aisle_config = new AisleConfig(config);
    this.categorize();
  }
  /**
   * Categorizes the ingredients in the shopping list
   * Will use the aisle config if any, otherwise all ingredients will be placed in the "other" category
   */
  categorize() {
    if (!this.aisle_config) {
      this.categories = { other: this.ingredients };
      return;
    }
    const categories = { other: [] };
    for (const category of this.aisle_config.categories) {
      categories[category.name] = [];
    }
    for (const ingredient of this.ingredients) {
      let found = false;
      for (const category of this.aisle_config.categories) {
        for (const aisleIngredient of category.ingredients) {
          if (aisleIngredient.aliases.includes(ingredient.name)) {
            categories[category.name].push(ingredient);
            found = true;
            break;
          }
        }
        if (found) {
          break;
        }
      }
      if (!found) {
        categories.other.push(ingredient);
      }
    }
    this.categories = categories;
  }
};
export {
  AisleConfig,
  Recipe,
  ShoppingList
};
//# sourceMappingURL=index.js.map