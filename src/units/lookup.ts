import type {
  QuantityWithExtendedUnit,
  QuantityWithUnitDef,
  UnitDefinitionLike,
} from "../types";
import { resolveUnit } from "./definitions";

export function areUnitsCompatible(
  u1: UnitDefinitionLike,
  u2: UnitDefinitionLike,
): boolean {
  if (u1.name === u2.name) {
    return true;
  }
  if (u1.type !== "other" && u1.type === u2.type && u1.system === u2.system) {
    return true;
  }
  return false;
}

export function findListWithCompatibleQuantity(
  list: QuantityWithUnitDef[][],
  quantity: QuantityWithExtendedUnit,
) {
  const quantityWithUnitDef = {
    ...quantity,
    unit: resolveUnit(quantity.unit?.name),
  };
  return list.find((l) =>
    l.some((lq) => areUnitsCompatible(lq.unit, quantityWithUnitDef.unit)),
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
