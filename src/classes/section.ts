import type { Step, Note } from "../types";

/**
 * Represents a recipe section
 *
 * Wrapped as a _Class_ and not defined as a simple _Type_ to expose some useful helper
 * classes (e.g. {@link Section.isBlank | isBlank()})
 *
 * @category Types
 */
export class Section {
  /**
   * The name of the section. Can be an empty string for the default (first) section.
   * @defaultValue `""`
   */
  name: string;
  /** An array of steps and notes that make up the content of the section. */
  content: (Step | Note)[] = [];
  /** Optional list of variant names this section belongs to. */
  variants?: string[];
  /** Whether the section has been marked as optional ([?]) */
  optional?: boolean;

  /**
   * Creates an instance of Section.
   * @param name - The name of the section. Defaults to an empty string.
   * @param variants - Optional variant names for this section.
   * @param optional - Whether the section is optional.
   */
  constructor(name: string = "", variants?: string[], optional?: boolean) {
    this.name = name;
    if (variants) this.variants = variants;
    if (optional) this.optional = true;
  }

  /**
   * Checks if the section is blank (has no name and no content).
   * Used during recipe parsing
   * @returns `true` if the section is blank, otherwise `false`.
   */
  isBlank(): boolean {
    return this.name === "" && this.content.length === 0;
  }
}
