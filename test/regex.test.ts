import { describe, it, expect } from "vitest";
import { metadataRegex, nestedMetaVarRegex } from "../src/regex";

describe("metadataRegex", () => {
  it("should match metadata", () => {
    expect(
      metadataRegex.test(`---
title: Pancakes
tags: [breakfast, easy]
---`),
    ).toBe(true);
  });
});

describe("nestedMetaVarRegex", () => {
  it("should match nested metadata variables", () => {
    const testString = `meta: 
  key: value
  anotherKey: 
    nestedKey: nestedValue`;
    const match = testString.match(nestedMetaVarRegex("meta"));
    expect(match).not.toBeNull();
  });
});
