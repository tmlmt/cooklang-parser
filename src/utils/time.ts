/**
 * Time duration units and parsing utilities.
 * Converts human-readable time strings to minutes.
 *
 * Supported formats (tried in order):
 * 1. Plain number → interpreted as minutes
 * 2. Compact `DdHhMm` → integers only, no spaces, `d`/`h`/`m` separators
 * 3. Unit-based → space-separated `<number><unit>` or `<number> <unit>` pairs
 */

import { compactTimeRegex, timeUnitTokenRegex } from "../regex";

/** Maps unit strings to their value in minutes. */
const timeUnitToMinutes: Record<string, number> = {
  // seconds
  s: 1 / 60,
  sec: 1 / 60,
  secs: 1 / 60,
  second: 1 / 60,
  seconds: 1 / 60,
  seconde: 1 / 60,
  secondes: 1 / 60,
  // minutes
  m: 1,
  min: 1,
  minute: 1,
  minutes: 1,
  // hours
  h: 60,
  hour: 60,
  hours: 60,
  heure: 60,
  heures: 60,
  // days
  d: 1440,
  day: 1440,
  days: 1440,
  j: 1440,
  jour: 1440,
  jours: 1440,
};

/**
 * Parses a time string or number into minutes.
 * Returns `undefined` if the input cannot be parsed.
 *
 * @param input - A string or number representing a duration.
 * @returns The duration in minutes (rounded to nearest integer), or `undefined`.
 */
export function parseTimeToMinutes(input: string | number): number | undefined {
  // Numeric input: plain number = minutes
  if (typeof input === "number") {
    return input;
  }

  const trimmed = input.trim();
  if (trimmed === "") return undefined;

  // Strategy 1: Plain number string → minutes
  const num = Number(trimmed);
  if (!isNaN(num) && isFinite(num)) {
    return Math.round(num);
  }

  // Strategy 2: Compact DdHhMm format (integers only, no spaces)
  const compact = compactTimeRegex.exec(trimmed);
  if (compact && compact[0] === trimmed) {
    const days = compact[1] ? parseInt(compact[1], 10) : 0;
    const hours = compact[2] ? parseInt(compact[2], 10) : 0;
    const minutes = compact[3] ? parseInt(compact[3], 10) : 0;
    /* v8 ignore else -- @preserve: At least one component must be present */
    if (days || hours || minutes) {
      return days * 1440 + hours * 60 + minutes;
    }
  }

  // Strategy 3: Unit-based format (space-separated pairs)
  // Validate that the entire string is consumed by tokens separated by whitespace
  const tokens: { value: number; unit: string }[] = [];
  let lastIndex = 0;

  for (const match of trimmed.matchAll(timeUnitTokenRegex)) {
    // Check that any gap between tokens is only whitespace
    const gap = trimmed.slice(lastIndex, match.index);
    if (gap.trim() !== "") return undefined;
    // Require whitespace between consecutive tokens
    if (lastIndex > 0 && gap.length === 0) return undefined;

    // Rejects unknown units
    const unit = match[2]!.toLowerCase();
    if (!(unit in timeUnitToMinutes)) return undefined;

    tokens.push({ value: parseFloat(match[1]!), unit });
    lastIndex = match.index + match[0].length;
  }

  // Check trailing content
  if (trimmed.slice(lastIndex).trim() !== "") return undefined;

  let total = 0;
  for (const token of tokens) {
    total += token.value * timeUnitToMinutes[token.unit]!;
  }

  return Math.round(total);
}
