import type { IngredientItem, RecipeChoices } from "../types";
import { Recipe } from "../classes/recipe";

/**
 * Determines if a specific alternative in an IngredientItem is selected
 * based on the applied choices.
 *
 * Use this in renderers to determine how an ingredient alternative should be displayed.
 *
 * @param recipe - The Recipe instance containing choices
 * @param choices - The choices that have been made
 * @param item - The IngredientItem to check
 * @param alternativeIndex - The index within item.alternatives to check (for inline alternatives only)
 * @returns true if this alternative is the selected one
 * @category Helpers
 *
 * @example
 * ```typescript
 * const recipe = new Recipe(cooklangText);
 * for (const item of step.items) {
 *   if (item.type === 'ingredient') {
 *     item.alternatives.forEach((alt, idx) => {
 *       const isSelected = isAlternativeSelected(item, idx, recipe, choices);
 *       // Render differently based on isSelected
 *     });
 *   }
 * }
 * ```
 */
export function isAlternativeSelected(
  recipe: Recipe,
  choices: RecipeChoices,
  item: IngredientItem,
  alternativeIndex?: number,
): boolean {
  // Grouped alternatives: check ingredientGroups map
  if (item.group) {
    // Get the selected index in the group (default to 0)
    const selectedIndex = choices?.ingredientGroups?.get(item.group);
    // Get the alternatives array for this group
    const groupAlternatives = recipe.choices.ingredientGroups.get(item.group);
    if (
      groupAlternatives &&
      selectedIndex &&
      selectedIndex < groupAlternatives.length
    ) {
      // Check if the selected alternative's itemId matches this item's id
      const selectedItemId = groupAlternatives[selectedIndex]?.itemId;
      return selectedItemId === item.id;
    }
    return false;
  }

  // Inline alternatives: check ingredientItems map
  const selectedIndex = choices?.ingredientItems?.get(item.id);
  return alternativeIndex === selectedIndex;
}
