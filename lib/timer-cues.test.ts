import { afterEach, describe, expect, test, vi } from "vitest";

import {
  isValidInterval,
  isValidRandomBounds,
  randomGap,
} from "@/lib/timer-cues";

describe("isValidInterval", () => {
  // Whole-second intervals that fit strictly inside the configured total,
  // including the boundaries 1 and total-1.
  test.each([
    [1, 2],
    [59, 60],
    [1, 60],
    [30, 60],
    [20, 60],
    [99, 100],
  ])("accepts interval %i within total %i", (interval, total) => {
    expect(isValidInterval(interval, total)).toBe(true);
  });

  // Zero and negatives are below the >= 1 floor.
  test.each([
    [0, 60],
    [-1, 60],
    [-30, 60],
  ])("rejects non-positive interval %i (total %i)", (interval, total) => {
    expect(isValidInterval(interval, total)).toBe(false);
  });

  // Non-integers are rejected even when they fall inside the range — this is
  // the case a naive `>= 1 && <= total` implementation would wrongly accept.
  test.each([
    [2.5, 60],
    [1.1, 60],
    [59.9, 60],
  ])("rejects non-integer interval %f (total %i)", (interval, total) => {
    expect(isValidInterval(interval, total)).toBe(false);
  });

  // An interval equal to or greater than the total only ever lands on
  // completion (suppressed) or never, so it is useless and rejected. The
  // equal-to-total case is what separates `< total` from a naive `<= total`.
  test.each([
    [60, 60],
    [61, 60],
    [100, 60],
  ])("rejects interval %i not strictly below total %i", (interval, total) => {
    expect(isValidInterval(interval, total)).toBe(false);
  });

  // Degenerate totals leave no room for any valid interval.
  test.each([
    [1, 1],
    [1, 0],
    [0, 0],
  ])("rejects interval %i against degenerate total %i", (interval, total) => {
    expect(isValidInterval(interval, total)).toBe(false);
  });
});

describe("randomGap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The formula maps Math.random() === 0 to the lower bound and the value just
  // below 1 to the upper bound, so both endpoints are reachable.
  test("returns the lower bound when Math.random is 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(randomGap(2, 4)).toBe(2);
  });

  test("returns the upper bound when Math.random is just below 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(randomGap(2, 4)).toBe(4);
  });

  // A mid-range value lands on an interior integer — guards against an off-by-one
  // or sign error in the formula that the endpoints alone would not catch.
  test("returns an interior value for a mid-range Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(randomGap(2, 4)).toBe(3);
  });

  // Across the whole [0, 1) range the result is always an integer within bounds.
  test("always returns an integer within [min, max]", () => {
    for (const r of [0, 0.1, 0.25, 0.5, 0.75, 0.999999]) {
      vi.spyOn(Math, "random").mockReturnValue(r);
      const gap = randomGap(3, 7);
      expect(Number.isInteger(gap)).toBe(true);
      expect(gap).toBeGreaterThanOrEqual(3);
      expect(gap).toBeLessThanOrEqual(7);
    }
  });
});

describe("isValidRandomBounds", () => {
  // lower is a valid interval, upper is a whole number strictly above it and
  // strictly inside the total — including the boundaries lower=1 and upper=total-1.
  test.each([
    [1, 2, 3],
    [2, 5, 10],
    [1, 9, 10],
  ])("accepts lower %i, upper %i within total %i", (lower, upper, total) => {
    expect(isValidRandomBounds(lower, upper, total)).toBe(true);
  });

  // Each invalid clause rejected independently.
  test.each([
    [0, 5, 10], // lower below the >= 1 floor
    [3, 3, 10], // upper not strictly above lower
    [5, 2, 10], // upper below lower
    [2, 10, 10], // upper equals the total
    [2, 11, 10], // upper above the total
    [1.5, 5, 10], // non-integer lower
    [2, 5.5, 10], // non-integer upper
  ])("rejects lower %f, upper %f within total %i", (lower, upper, total) => {
    expect(isValidRandomBounds(lower, upper, total)).toBe(false);
  });
});
