const legacyDeepClone = <T>(v: T): T => {
  if (v === null || typeof v !== "object") {
    return v;
  }
  if (v instanceof Map) {
    return new Map(
      Array.from(v.entries()).map(([k, val]) => [
        legacyDeepClone(k),
        legacyDeepClone(val),
      ])
    ) as T;
  }
  if (v instanceof Set) {
    return new Set(Array.from(v).map((val: unknown) => legacyDeepClone(val))) as T;
  }
  if (v instanceof Date) {
    return new Date(v.getTime()) as T;
  }
  if (Array.isArray(v)) {
    return v.map((item: unknown) => legacyDeepClone(item)) as T;
  }
  const cloned = {} as Record<string, unknown>;
  for (const key of Object.keys(v)) {
    cloned[key] = legacyDeepClone((v as Record<string, unknown>)[key]);
  }
  return cloned as T;
};

export const deepClone = <T>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : legacyDeepClone(v);
