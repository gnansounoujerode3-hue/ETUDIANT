import { describe, expect, it, vi, afterEach } from "vitest";
import { scoreToQuality, sm2Update } from "../src/lib/sm2";

afterEach(() => vi.useRealTimers());

describe("scoreToQuality", () => {
  it("borne et convertit les scores vers une qualité de 0 à 5", () => {
    expect(scoreToQuality(-10)).toBe(0);
    expect(scoreToQuality(0)).toBe(0);
    expect(scoreToQuality(50)).toBe(3);
    expect(scoreToQuality(100)).toBe(5);
    expect(scoreToQuality(120)).toBe(5);
  });
});

describe("sm2Update", () => {
  it("reprogramme un échec dans dix minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    const result = sm2Update(null, 20);
    expect(result.repetitions).toBe(0);
    expect(result.lapses).toBe(1);
    expect(result.intervalDays).toBe(0);
    expect(result.nextDueAt.toISOString()).toBe("2026-11-03T12:10:00.000Z");
  });

  it("espace progressivement les réussites", () => {
    const first = sm2Update(null, 100);
    const second = sm2Update(first, 100);
    const third = sm2Update(second, 100);
    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(3);
    expect(third.intervalDays).toBeGreaterThan(3);
    expect(third.repetitions).toBe(3);
  });

  it("ne descend jamais sous le facteur de facilité minimum", () => {
    const result = sm2Update({ easiness: 1.3, intervalDays: 1, repetitions: 2, lapses: 5 }, 0);
    expect(result.easiness).toBe(1.3);
  });
});
