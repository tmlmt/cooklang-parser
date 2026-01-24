import type { QuantityWithExtendedUnit, QuantityWithUnitDef } from "../types";
import { resolveUnit } from "./definitions";
import { areUnitsGroupable } from "./compatibility";

export function findListWithCompatibleQuantity(
  list: QuantityWithUnitDef[][],
  quantity: QuantityWithExtendedUnit,
) {
  const quantityWithUnitDef = {
    ...quantity,
    unit: resolveUnit(quantity.unit?.name),
  };
  return list.find((l) =>
    l.some((lq) => areUnitsGroupable(lq.unit, quantityWithUnitDef.unit)),
  );
}

export function findCompatibleQuantityWithinList(
  list: QuantityWithUnitDef[],
  quantity: QuantityWithExtendedUnit,
): QuantityWithUnitDef | undefined {
  const quantityWithUnitDef = {
    ...quantity,
    unit: resolveUnit(quantity.unit?.name),
  };
  return list.find(
    (q) =>
      q.unit.name === quantityWithUnitDef.unit.name ||
      (q.unit.type === quantityWithUnitDef.unit.type &&
        q.unit.type !== "other"),
  );
}
