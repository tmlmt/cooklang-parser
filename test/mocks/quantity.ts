import type {
  QuantityWithExtendedUnit,
  QuantityWithPlainUnit,
  QuantityWithUnitDef,
} from "../../src/types";
import { getNormalizedUnit } from "../../src/models/unit_definitions";

// Minimal mock for Quantity and FixedValue for testing
export const q = (
  amount: number,
  unit?: string,
  integerProtected?: boolean,
): QuantityWithExtendedUnit => {
  const quantity: QuantityWithExtendedUnit = {
    quantity: { type: "fixed", value: { type: "decimal", decimal: amount } },
  };
  if (unit) {
    quantity.unit = { name: unit };
    if (integerProtected) {
      quantity.unit.integerProtected = integerProtected;
    }
  }
  return quantity;
};

// Minimal mock for Quantity and FixedValue for testing
export const qPlain = (
  amount: number,
  unit?: string,
): QuantityWithPlainUnit => {
  const quantity: QuantityWithPlainUnit = {
    quantity: { type: "fixed", value: { type: "decimal", decimal: amount } },
  };
  if (unit) {
    quantity.unit = unit;
  }
  return quantity;
};

export const qWithUnitDef = (
  amount: number,
  unit?: string,
  integerProtected?: boolean,
): QuantityWithUnitDef => {
  const quantity = q(amount, unit, integerProtected);
  quantity.unit = getNormalizedUnit(quantity.unit?.name);
  if (integerProtected) {
    quantity.unit.integerProtected = integerProtected;
  }
  return quantity as QuantityWithUnitDef;
};
