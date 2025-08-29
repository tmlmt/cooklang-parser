import { describe, it, expect } from "vitest";
import { metadataRegex } from "../src/regex";

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
