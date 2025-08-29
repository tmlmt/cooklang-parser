import { describe, it, expect } from "vitest";
import { metadataRegex } from "../src/regex";

describe("metadataRegex", () => {
  it("should match metadata", () => {
    console.log(metadataRegex.source);
    expect(
      metadataRegex.test(`---
title: Pancakes
tags: [breakfast, easy]
---`),
    ).toBe(true);
  });
});
