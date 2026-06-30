// Pure helpers for the timer's training-cue features. No React/DOM here so the
// logic stays unit-testable and shareable (BPR-005's random cue extends this
// module). The Pace interval is valid when it is a whole number of seconds that
// fits strictly inside the configured countdown — an interval equal to the
// total would only ever land on completion, which is suppressed, so it is
// rejected as useless.
export const isValidInterval = (
  intervalSeconds: number,
  configuredTotal: number,
): boolean =>
  Number.isInteger(intervalSeconds) &&
  intervalSeconds >= 1 &&
  intervalSeconds < configuredTotal;

// Uniform random integer in [min, max] inclusive. Math.random() in [0, 1) maps
// 0 -> min and 0.999... -> max, so both endpoints are reachable.
export const randomGap = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

// The random cue's bounds are valid when the lower bound is a valid interval
// (whole number, >= 1, strictly inside the total) and the upper bound is a whole
// number strictly above it yet still inside the total. `upper > lower >= 1`
// already implies `upper >= 2`, so no separate lower floor on the upper is needed.
export const isValidRandomBounds = (
  lower: number,
  upper: number,
  configuredTotal: number,
): boolean =>
  isValidInterval(lower, configuredTotal) &&
  Number.isInteger(upper) &&
  upper > lower &&
  upper < configuredTotal;
