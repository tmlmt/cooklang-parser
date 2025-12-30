import { isNoUnit } from "../units/definitions";
import type {
  QuantityWithPlainUnit,
  QuantityWithExtendedUnit,
  QuantityWithUnitDef,
  UnitDefinitionLike,
  FlatOrGroup,
  MaybeNestedOrGroup,
  FlatAndGroup,
  FlatGroup,
  MaybeNestedGroup,
} from "../types";
import { resolveUnit } from "../units/definitions";
import { multiplyQuantityValue, getAverageValue } from "./numeric";
import Big from "big.js";
import { isGroup, isOrGroup, isQuantity } from "../utils/type_guards";
import {
  getDefaultQuantityValue,
  addQuantities,
  deNormalizeQuantity,
  toPlainUnit,
} from "./mutations";
import { isValueIntegerLike } from "./math";
import { getUnitRatio, getBaseUnitRatio } from "../units/conversion";
import {
  areUnitsCompatible,
  findCompatibleQuantityWithinList,
  findListWithCompatibleQuantity,
} from "../units/lookup";
import { deepClone } from "../utils/general";

export function getEquivalentUnitsLists(
  ...quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[]
): QuantityWithUnitDef[][] {
  const quantitiesCopy = deepClone(quantities);

  const OrGroups = (
    quantitiesCopy.filter(isOrGroup) as FlatOrGroup<QuantityWithExtendedUnit>[]
  ).filter((q) => q.quantities.length > 1);

  const unitLists: QuantityWithUnitDef[][] = [];
  function normalizeOrGroup(og: FlatOrGroup<QuantityWithExtendedUnit>) {
    return {
      ...og,
      quantities: og.quantities.map((q) => {
        if (isQuantity(q)) {
          const integerProtected = q.unit?.integerProtected;
          const normalizedUnit = resolveUnit(q.unit?.name);
          const unit = integerProtected
            ? { ...normalizedUnit, integerProtected: true }
            : normalizedUnit;
          return { ...q, unit } as QuantityWithUnitDef;
        }
        return q as QuantityWithUnitDef;
      }),
    };
  }

  function findLinkIndexForUnits(
    lists: QuantityWithUnitDef[][],
    unitsToCheck: (UnitDefinitionLike | undefined)[],
  ) {
    return lists.findIndex((l) => {
      const listItem = l.map((q) => resolveUnit(q.unit?.name));
      return unitsToCheck.some((u) =>
        listItem.some(
          (lu) =>
            lu.name === u?.name ||
            (lu.system === u?.system &&
              lu.type === u?.type &&
              lu.type !== "other"),
        ),
      );
    });
  }

  function mergeOrGroupIntoList(
    lists: QuantityWithUnitDef[][],
    idx: number,
    og: ReturnType<typeof normalizeOrGroup>,
  ) {
    let unitRatio: Big | undefined;
    const commonUnitList = lists[idx]!.reduce((acc, v) => {
      const normalizedV: QuantityWithUnitDef = {
        ...v,
        unit: resolveUnit(v.unit?.name),
      };
      if (v.unit?.integerProtected) normalizedV.unit.integerProtected = true;

      const commonQuantity = og.quantities.find(
        (q) => isQuantity(q) && areUnitsCompatible(q.unit, normalizedV.unit),
      );
      if (commonQuantity) {
        acc.push(normalizedV);
        unitRatio = getUnitRatio(normalizedV, commonQuantity);
      }
      return acc;
    }, [] as QuantityWithUnitDef[]);

    for (const newQ of og.quantities) {
      if (commonUnitList.some((q) => areUnitsCompatible(q.unit, newQ.unit))) {
        continue;
      } else {
        const scaledQuantity = multiplyQuantityValue(newQ.quantity, unitRatio!);
        lists[idx]!.push({ ...newQ, quantity: scaledQuantity });
      }
    }
  }

  for (const orGroup of OrGroups) {
    const orGroupModified = normalizeOrGroup(orGroup);
    const units = orGroupModified.quantities.map((q) => q.unit);
    const linkIndex = findLinkIndexForUnits(unitLists, units);
    if (linkIndex === -1) {
      unitLists.push(orGroupModified.quantities);
    } else {
      mergeOrGroupIntoList(unitLists, linkIndex, orGroupModified);
    }
  }

  return unitLists;
}

/**
 * List sorting helper for equivalent units
 * @param list - list of quantities to sort
 * @returns sorted list of quantities with integerProtected units first, then no-unit, then the rest alphabetically
 */
function sortUnitList(list: QuantityWithUnitDef[]) {
  if (!list || list.length <= 1) return list;
  const priorityList: QuantityWithUnitDef[] = [];
  const nonPriorityList: QuantityWithUnitDef[] = [];
  for (const q of list) {
    if (q.unit.integerProtected || q.unit.system === "none") {
      priorityList.push(q);
    } else {
      nonPriorityList.push(q);
    }
  }

  return priorityList
    .sort((a, b) => {
      let prefixA = "";
      if (a.unit.integerProtected) prefixA = "___";
      else if (a.unit.system === "none") prefixA = "__";
      let prefixB = "";
      if (b.unit.integerProtected) prefixB = "___";
      else if (b.unit.system === "none") prefixB = "__";
      return (prefixA + a.unit.name).localeCompare(prefixB + b.unit.name);
    })
    .concat(nonPriorityList);
}

export function reduceOrsToFirstEquivalent(
  unitList: QuantityWithUnitDef[][],
  quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[],
): QuantityWithExtendedUnit[] {
  function reduceToQuantity(firstQuantity: QuantityWithExtendedUnit) {
    // Look for the global list of equivalent for this quantity unit;
    const equivalentList = sortUnitList(
      findListWithCompatibleQuantity(unitList, firstQuantity)!,
    );
    if (!equivalentList) return firstQuantity;
    // Find that first quantity in the OR
    const firstQuantityInList = findCompatibleQuantityWithinList(
      equivalentList,
      firstQuantity,
    )!;
    // Normalize the first quantity's unit
    const normalizedFirstQuantity: QuantityWithUnitDef = {
      ...firstQuantity,
      unit: resolveUnit(firstQuantity.unit?.name),
    };
    // Priority 1: the first quantity has an integer-protected unit
    if (firstQuantityInList.unit.integerProtected) {
      const resultQuantity: QuantityWithExtendedUnit = {
        quantity: firstQuantity.quantity,
      };
      if (!isNoUnit(normalizedFirstQuantity.unit)) {
        resultQuantity.unit = { name: normalizedFirstQuantity.unit.name };
      }
      return resultQuantity;
    } else {
      // Priority 2: the next integer-protected units in the equivalent list
      let nextProtected: number | undefined;
      const equivalentListTemp = [...equivalentList];
      while (nextProtected !== -1) {
        nextProtected = equivalentListTemp.findIndex(
          (eq) => eq.unit?.integerProtected,
        );
        // Ratio between the values in the OR group vs the ones used in the equivalent unit list
        if (nextProtected !== -1) {
          const unitRatio = getUnitRatio(
            equivalentListTemp[nextProtected]!,
            firstQuantityInList,
          );
          const nextProtectedQuantityValue = multiplyQuantityValue(
            firstQuantity.quantity,
            unitRatio,
          );
          if (isValueIntegerLike(nextProtectedQuantityValue)) {
            const nextProtectedQuantity: QuantityWithExtendedUnit = {
              quantity: nextProtectedQuantityValue,
            };
            if (!isNoUnit(equivalentListTemp[nextProtected]!.unit)) {
              nextProtectedQuantity.unit = {
                name: equivalentListTemp[nextProtected]!.unit.name,
              };
            }

            return nextProtectedQuantity;
          } else {
            equivalentListTemp.splice(nextProtected, 1);
          }
        }
      }

      // Priority 3: the first non-integer-Protected value of the list
      const firstNonIntegerProtected = equivalentListTemp.filter(
        (q) => !q.unit.integerProtected,
      )[0]!;
      const unitRatio = getUnitRatio(
        firstNonIntegerProtected,
        firstQuantityInList,
      ).times(getBaseUnitRatio(normalizedFirstQuantity, firstQuantityInList));
      const firstEqQuantity: QuantityWithExtendedUnit = {
        quantity:
          firstNonIntegerProtected.unit.name === firstQuantity.unit!.name
            ? firstQuantity.quantity
            : multiplyQuantityValue(firstQuantity.quantity, unitRatio),
      };
      if (!isNoUnit(firstNonIntegerProtected.unit)) {
        firstEqQuantity.unit = { name: firstNonIntegerProtected.unit.name };
      }
      return firstEqQuantity;
    }
  }
  return quantities.map((q) => {
    if (isQuantity(q)) return reduceToQuantity(q);
    // Now, q is necessarily an OR group
    // We normalize units and sort them to get integerProtected elements first, then no units, then the rest
    const qListModified = sortUnitList(
      q.quantities.map((qq) => {
        const integerProtected = qq.unit?.integerProtected;
        const unit = resolveUnit(qq.unit?.name);
        if (integerProtected) unit.integerProtected = true;
        return { ...qq, unit } as QuantityWithUnitDef;
      }),
    );
    // We can simply use the first element
    return reduceToQuantity(qListModified[0]!);
  });
}

export function addQuantitiesOrGroups(
  ...quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[]
): {
  sum: QuantityWithUnitDef | FlatGroup<QuantityWithUnitDef>;
  unitsLists: QuantityWithUnitDef[][];
} {
  if (quantities.length === 0)
    return {
      sum: {
        quantity: getDefaultQuantityValue(),
        unit: resolveUnit("__no-unit__"),
      },
      unitsLists: [],
    };
  if (quantities.length === 1) {
    if (isQuantity(quantities[0]!))
      return {
        sum: {
          ...quantities[0],
          unit: resolveUnit(quantities[0].unit?.name),
        },
        unitsLists: [],
      };
  }
  // Step 1: find equivalents units
  const unitsLists = getEquivalentUnitsLists(...quantities);
  // Step 2: reduce the OR group to Quantities
  const reducedQuantities = reduceOrsToFirstEquivalent(unitsLists, quantities);
  // Step 3: calculate the sum
  const sum: QuantityWithUnitDef[] = [];
  for (const nextQ of reducedQuantities) {
    const existingQ = findCompatibleQuantityWithinList(sum, nextQ);
    if (existingQ === undefined) {
      sum.push({
        ...nextQ,
        unit: resolveUnit(nextQ.unit?.name),
      });
    } else {
      const sumQ = addQuantities(existingQ, nextQ);
      existingQ.quantity = sumQ.quantity;
      existingQ.unit = resolveUnit(sumQ.unit?.name);
    }
  }
  if (sum.length === 1) {
    return { sum: sum[0]!, unitsLists };
  }
  return { sum: { type: "and", quantities: sum }, unitsLists };
}

function regroupQuantitiesAndExpandEquivalents(
  sum: QuantityWithUnitDef | FlatGroup<QuantityWithUnitDef>,
  unitsLists: QuantityWithUnitDef[][],
): (QuantityWithExtendedUnit | MaybeNestedOrGroup<QuantityWithExtendedUnit>)[] {
  const sumQuantities = isGroup(sum) ? sum.quantities : [sum];
  const result: (
    | QuantityWithExtendedUnit
    | MaybeNestedOrGroup<QuantityWithExtendedUnit>
  )[] = [];
  const processedQuantities = new Set<QuantityWithUnitDef>();

  for (const list of unitsLists) {
    const listCopy = [...list];
    const main: QuantityWithUnitDef[] = [];
    const mainCandidates = sumQuantities.filter(
      (q) => !processedQuantities.has(q),
    );

    if (mainCandidates.length === 0) continue;

    mainCandidates.forEach((q) => {
      // If the sum contain a value from the unit list, we push it to the mains and remove it from the list
      const mainInList = findCompatibleQuantityWithinList(listCopy, q);
      if (mainInList !== undefined) {
        processedQuantities.add(q);
        main.push(q);
        listCopy.splice(listCopy.indexOf(mainInList), 1);
      }
    });

    // We sort the equivalent units and calculate the equivalent value for each of them
    const equivalents = sortUnitList(listCopy).map((equiv) => {
      const initialValue: QuantityWithExtendedUnit = {
        quantity: getDefaultQuantityValue(),
      };
      if (equiv.unit) {
        initialValue.unit = { name: equiv.unit.name };
      }
      return main.reduce((acc, v) => {
        const mainInList = findCompatibleQuantityWithinList(list, v)!;
        const newValue: QuantityWithExtendedUnit = {
          quantity: multiplyQuantityValue(
            v.quantity,
            Big(getAverageValue(equiv.quantity)).div(
              getAverageValue(mainInList.quantity),
            ),
          ),
        };
        if (equiv.unit && !isNoUnit(equiv.unit)) {
          newValue.unit = { name: equiv.unit.name };
        }
        return addQuantities(acc, newValue);
      }, initialValue);
    });

    if (main.length + equivalents.length > 1) {
      const resultMain:
        | QuantityWithExtendedUnit
        | FlatAndGroup<QuantityWithExtendedUnit> =
        main.length > 1
          ? {
              type: "and",
              quantities: main.map(deNormalizeQuantity),
            }
          : deNormalizeQuantity(main[0]!);
      result.push({
        type: "or",
        quantities: [resultMain, ...equivalents],
      });
    } else {
      result.push(deNormalizeQuantity(main[0]!));
    }
  }

  // We add at the end the lone quantities
  sumQuantities
    .filter((q) => !processedQuantities.has(q))
    .forEach((q) => result.push(deNormalizeQuantity(q)));

  return result;
}

export function addEquivalentsAndSimplify(
  ...quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[]
): QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit> {
  if (quantities.length === 1) {
    return toPlainUnit(quantities[0]!);
  }
  // Step 1+2+3: find equivalents, reduce groups and add quantities
  const { sum, unitsLists } = addQuantitiesOrGroups(...quantities);
  // Step 4: regroup and expand equivalents per group
  const regrouped = regroupQuantitiesAndExpandEquivalents(sum, unitsLists);
  if (regrouped.length === 1) {
    return toPlainUnit(regrouped[0]!);
  } else {
    return { type: "and", quantities: regrouped.map(toPlainUnit) };
  }
}
