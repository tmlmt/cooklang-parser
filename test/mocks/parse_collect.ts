import { DiagnosticError } from "../../src/index";
import type { Diagnostic } from "../../src/types";

/**
 * Runs `instance.parse(source)` and returns the collected diagnostics whether
 * or not the parse threw a {@link DiagnosticError}.
 */
export function parseCollect<
  T extends { parse(source: string): unknown; diagnostics: Diagnostic[] },
>(instance: T, source: string) {
  try {
    instance.parse(source);
  } catch (e) {
    if (!(e instanceof DiagnosticError)) throw e;
  }
  return { output: instance, diagnostics: instance.diagnostics, source };
}
