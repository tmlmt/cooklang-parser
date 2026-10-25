import { expect } from "vitest";
import type { Diagnostic, DiagnosticCode } from "../../src/types";

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

type ValueOf<T> = T[keyof T];

export interface DiagnosticMatchOptions {
  /** Exact number of diagnostics with this code (defaults to at least one). */
  times?: number;
  /** Additional fields that a diagnostic with this code must match (subset match). */
  match?: DeepPartial<Diagnostic>;
}

declare module "vitest" {
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    // T must be declared to match vitest's own Matchers interface
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    T = unknown,
  > {
    /**
     * Asserts that an array of diagnostics contains the given code.
     * Use `times` to assert an exact count and `match` to assert extra fields.
     */
    toHaveDiagnostic(code: DiagnosticCode, options?: DiagnosticMatchOptions): R;
  }
}

const prettyDiagnostic = (
  d: DeepPartial<Diagnostic>,
  match?: DeepPartial<Diagnostic>,
): string => {
  let output = "";
  for (const [key, value] of Object.entries(d).filter(
    (entry) => entry[0] !== "span",
  )) {
    if (!match || key in match)
      output +=
        (output.length ? "\n" : "") +
        `${key}: ${value as ValueOf<Omit<DeepPartial<Diagnostic>, "span">>}`;
  }
  if (d.span) {
    output += output.length ? "\n" : "";
    output += `span: ${d.span?.start?.line}:${d.span?.start?.column}(${d.span?.start?.offset})`;
    output += ` to ${d.span?.end?.line}:${d.span?.end?.column}(${d.span?.end?.offset})`;
  }
  return output;
};

expect.extend({
  toHaveDiagnostic(
    received: Diagnostic[],
    code: DiagnosticCode,
    options: DiagnosticMatchOptions = {},
  ) {
    const { times, match } = options;
    const sameCode = received.filter((d) => d.code === code);
    const matching = match
      ? sameCode.filter((d) =>
          Object.entries(match).every(([key, value]) =>
            this.equals(d[key as keyof Diagnostic], value, [
              this.utils.iterableEquality,
              this.utils.subsetEquality,
            ]),
          ),
        )
      : sameCode;
    const pass =
      times === undefined ? matching.length > 0 : matching.length === times;
    const expected =
      (times === undefined ? "at least one" : `${times}`) +
      ` ${code}` +
      (match ? ` matching: \n${prettyDiagnostic(match)}` : "");
    const actual = received.length
      ? received.map((d) => prettyDiagnostic(d, match)).join("\n---\n")
      : "no diagnostics";

    return {
      pass,
      message: () =>
        pass
          ? `Expected diagnostics not to contain ${expected},\nbut found ${matching.length} match(es)`
          : `Expected diagnostics to contain ${expected}\nbut found ${matching.length} match(es). Received: \n${actual})`,
    };
  },
});
