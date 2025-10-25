import { IngredientFlag, CookwareFlag } from "./types";

export class ReferencedItemCannotBeRedefinedError extends Error {
  constructor(
    item_type: "ingredient" | "cookware",
    item_name: string,
    new_modifier: IngredientFlag | CookwareFlag,
  ) {
    super(
      `The referenced ${item_type} "${item_name}" cannot be redefined as ${new_modifier}.
You can either remove the reference to create a new ${item_type} defined as ${new_modifier} or add the ${new_modifier} flag to the original definition of the ${item_type}`,
    );
    this.name = "ReferencedItemCannotBeRedefinedError";
  }
}
