import { describe, expect, test } from "vitest";

import { isValidInterval } from "@/lib/timer-cues";

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
