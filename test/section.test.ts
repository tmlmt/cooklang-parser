import { Section } from "../src/classes/section";
import { describe, it, expect } from "vitest";

describe("isBlank", () => {
  it("should correctly check whether a section is blank", () => {
    const section = new Section();
    expect(section.isBlank()).toBe(true);
    section.content.push({ note: "test" });
    expect(section.isBlank()).toBe(false);
  });
});
