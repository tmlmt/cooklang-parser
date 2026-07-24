import { describe, it, expect } from "vitest";
import { parseTimeToMinutes } from "../src/utils/time";

describe("parseTimeToMinutes", () => {
  describe("Strategy 1: Plain numbers", () => {
    it("returns numeric input as-is", () => {
      expect(parseTimeToMinutes(30)).toBe(30);
      expect(parseTimeToMinutes(0)).toBe(0);
      expect(parseTimeToMinutes(1.5)).toBe(1.5);
    });

    it("parses integer strings as minutes", () => {
      expect(parseTimeToMinutes("30")).toBe(30);
      expect(parseTimeToMinutes("0")).toBe(0);
      expect(parseTimeToMinutes("120")).toBe(120);
    });

    it("parses float strings and rounds", () => {
      expect(parseTimeToMinutes("30.4")).toBe(30);
      expect(parseTimeToMinutes("30.5")).toBe(31);
      expect(parseTimeToMinutes("30.9")).toBe(31);
    });

    it("handles whitespace", () => {
      expect(parseTimeToMinutes("  30  ")).toBe(30);
    });

    it("returns undefined for empty string", () => {
      expect(parseTimeToMinutes("")).toBeUndefined();
      expect(parseTimeToMinutes("   ")).toBeUndefined();
    });
  });

  describe("Strategy 2: Compact DdHhMm format", () => {
    it("parses hours only", () => {
      expect(parseTimeToMinutes("1h")).toBe(60);
      expect(parseTimeToMinutes("2h")).toBe(120);
    });

    it("parses minutes only", () => {
      expect(parseTimeToMinutes("30m")).toBe(30);
      expect(parseTimeToMinutes("90m")).toBe(90);
    });

    it("parses days only", () => {
      expect(parseTimeToMinutes("1d")).toBe(1440);
      expect(parseTimeToMinutes("2d")).toBe(2880);
    });

    it("parses combined hour+minute", () => {
      expect(parseTimeToMinutes("1h30m")).toBe(90);
      expect(parseTimeToMinutes("2h15m")).toBe(135);
    });

    it("allows minutes > 59", () => {
      expect(parseTimeToMinutes("1h90m")).toBe(150);
    });

    it("parses full day+hour+minute", () => {
      expect(parseTimeToMinutes("1d1h1m")).toBe(1501);
    });

    it("parses day+hour", () => {
      expect(parseTimeToMinutes("1d2h")).toBe(1560);
    });

    it("parses day+minute", () => {
      expect(parseTimeToMinutes("1d30m")).toBe(1470);
    });

    it("is case-insensitive", () => {
      expect(parseTimeToMinutes("1H30M")).toBe(90);
      expect(parseTimeToMinutes("1D2H30M")).toBe(1590);
    });

    it("rejects invalid compact formats", () => {
      // seconds not allowed in compact
      expect(parseTimeToMinutes("1m1s")).toBeUndefined();
    });
  });

  describe("Strategy 3: Unit-based format", () => {
    it("parses single unit", () => {
      expect(parseTimeToMinutes("1 hour")).toBe(60);
      expect(parseTimeToMinutes("90 minutes")).toBe(90);
      expect(parseTimeToMinutes("1 day")).toBe(1440);
    });

    it("parses attached unit (no space)", () => {
      expect(parseTimeToMinutes("1hour")).toBe(60);
      expect(parseTimeToMinutes("30min")).toBe(30);
    });

    it("parses multiple space-separated pairs", () => {
      expect(parseTimeToMinutes("1 hour 30 min")).toBe(90);
      expect(parseTimeToMinutes("1hour 30min")).toBe(90);
    });

    it("rounds seconds to minutes", () => {
      expect(parseTimeToMinutes("45 secs")).toBe(1);
      expect(parseTimeToMinutes("30 seconds")).toBe(1);
      expect(parseTimeToMinutes("120 seconds")).toBe(2);
    });

    it("handles float values", () => {
      expect(parseTimeToMinutes("1.5 hours")).toBe(90);
      expect(parseTimeToMinutes("0.5 hour")).toBe(30);
    });

    it("handles French time units", () => {
      expect(parseTimeToMinutes("1 heure")).toBe(60);
      expect(parseTimeToMinutes("2 heures")).toBe(120);
      expect(parseTimeToMinutes("30 secondes")).toBe(1);
      expect(parseTimeToMinutes("1 jour")).toBe(1440);
      expect(parseTimeToMinutes("2 jours")).toBe(2880);
    });

    it("handles Japanese time units", () => {
      expect(parseTimeToMinutes("30秒")).toBe(1);
      expect(parseTimeToMinutes("45 秒")).toBe(1);
      expect(parseTimeToMinutes("30分")).toBe(30);
      expect(parseTimeToMinutes("30 分間")).toBe(30);
      expect(parseTimeToMinutes("1時間")).toBe(60);
      expect(parseTimeToMinutes("2 時")).toBe(120);
      expect(parseTimeToMinutes("1日")).toBe(1440);
      expect(parseTimeToMinutes("2 日間")).toBe(2880);
    });

    it("parses multiple space-separated Japanese pairs", () => {
      expect(parseTimeToMinutes("1時間 30分")).toBe(90);
      expect(parseTimeToMinutes("1日 2時間 30分")).toBe(1590);
    });

    it("handles all second aliases", () => {
      expect(parseTimeToMinutes("60 s")).toBe(1);
      expect(parseTimeToMinutes("60 sec")).toBe(1);
      expect(parseTimeToMinutes("60 secs")).toBe(1);
      expect(parseTimeToMinutes("60 second")).toBe(1);
      expect(parseTimeToMinutes("60 seconds")).toBe(1);
      expect(parseTimeToMinutes("60 seconde")).toBe(1);
      expect(parseTimeToMinutes("60 secondes")).toBe(1);
    });

    it("rejects unknown units", () => {
      expect(parseTimeToMinutes("1 week")).toBeUndefined();
      expect(parseTimeToMinutes("1 month")).toBeUndefined();
    });

    it("rejects attached pairs without space between them", () => {
      // "1hour30min" — no space between pairs when both attached
      expect(parseTimeToMinutes("1hour30min")).toBeUndefined();
    });

    it("rejects non-parseable strings", () => {
      expect(parseTimeToMinutes("about an hour")).toBeUndefined();
      expect(parseTimeToMinutes("quick")).toBeUndefined();
    });

    it("rejects valid tokens followed by trailing text", () => {
      expect(parseTimeToMinutes("1 hour rest")).toBeUndefined();
    });

    it("rejects tokens preceded by non-whitespace", () => {
      expect(parseTimeToMinutes("about 1 hour")).toBeUndefined();
    });
  });
});
