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
