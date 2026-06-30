import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Timer } from "@/components/timer";

// Every `new Audio(src)` constructed during a test is recorded here so we can
// assert which cue played, by source, without ever touching real audio.
let constructedSrcs: string[] = [];

// jsdom has no real <audio>. We mock window.Audio so that:
//  - the constructor records its src,
//  - play() returns a *rejected* promise. handleStart only kicks off the
//    countdown from the start bell's "ended" listener OR from play()'s .catch
//    (timer.tsx:111-118); rejecting play() routes straight to beginTick()
//    deterministically, with no fake event to dispatch.
//  - pause()/addEventListener() are inert no-ops.
class AudioMock {
  src: string;
  play = vi.fn(() => Promise.reject(new Error("autoplay blocked")));
  pause = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  constructor(src: string) {
    this.src = src;
    constructedSrcs.push(src);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("Audio", AudioMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  constructedSrcs = [];
});

const minutesInput = () => screen.getByLabelText("Minutes");
const secondsInput = () => screen.getByLabelText("Seconds");
const startButton = () => screen.getByRole("button", { name: "Start" });
const pauseButton = () => screen.getByRole("button", { name: "Pause" });
const resumeButton = () => screen.getByRole("button", { name: "Resume" });
const resetButton = () => screen.getByRole("button", { name: "Reset" });

// BPR-004 Pace-cue helpers. The Normal/Pace radios take their accessible name
// from the associated <Label htmlFor>; paceInput from its "Pace (sec)" label.
// The pace input only renders in Pace mode, so query it after switching.
const offRadio = () => screen.getByRole("radio", { name: "Normal" });
const paceRadio = () => screen.getByRole("radio", { name: "Pace" });
const paceInput = () => screen.getByLabelText("Pace (sec)");
// BPR-005 Random-cue helpers. The Min/Max inputs only render in Random mode.
const randomRadio = () => screen.getByRole("radio", { name: "Random" });
const minInput = () => screen.getByLabelText("Min (sec)");
const maxInput = () => screen.getByLabelText("Max (sec)");
// Counts cue beeps ONLY when no pause/reset happened in the window, since those
// also construct /audio/interval.mp3 (see CRITICAL harness note in the task).
const beeps = () =>
  constructedSrcs.filter((s) => s === "/audio/interval.mp3").length;

const setDuration = (min: number, sec: number) => {
  fireEvent.change(minutesInput(), { target: { value: String(min) } });
  fireEvent.change(secondsInput(), { target: { value: String(sec) } });
};

// Click Start, then flush the rejected play() microtask so beginTick() runs.
const start = async () => {
  await act(async () => {
    fireEvent.click(startButton());
    await Promise.resolve();
  });
};

// Click Resume, then flush the rejected play() microtask so beginTick() runs
// from the resume bell's play().catch — same gating as start().
const resume = async () => {
  await act(async () => {
    fireEvent.click(resumeButton());
    await Promise.resolve();
  });
};

// Drive the setInterval/setTimeout clock inside act so state updates flush.
const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe("Timer", () => {
  test("3.1 formats the countdown as zero-padded mm:ss", () => {
    render(<Timer />);

    setDuration(2, 5);
    expect(screen.getByText("02:05")).toBeInTheDocument();

    setDuration(0, 9);
    expect(screen.getByText("00:09")).toBeInTheDocument();
  });

  test("3.2 decrements once per second", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();

    expect(screen.getByText("00:05")).toBeInTheDocument();
    for (const expected of ["00:04", "00:03", "00:02", "00:01", "00:00"]) {
      advance(1000);
      expect(screen.getByText(expected)).toBeInTheDocument();
    }
  });

  test("3.3 marks completion with idle colour, stop cue, enabled inputs", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();

    advance(5000); // exactly five ticks -> 00:00 (completion returns to idle)

    const digits = screen.getByText("00:00");
    expect(digits).toHaveClass("text-timer-idle");
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");
    expect(minutesInput()).toBeEnabled();
    expect(secondsInput()).toBeEnabled();
  });

  test("3.4 clamps seconds to 59", () => {
    render(<Timer />);

    fireEvent.change(secondsInput(), { target: { value: "75" } });

    expect(secondsInput()).toHaveValue(59);
    expect(secondsInput()).not.toHaveValue(75);
    expect(screen.getByText("00:59")).toBeInTheDocument();
  });

  test("3.5 the primary toggle is enabled regardless of duration and becomes Pause while running", async () => {
    render(<Timer />);
    expect(startButton()).toBeEnabled();

    setDuration(0, 5);
    expect(startButton()).toBeEnabled();

    await start();
    expect(pauseButton()).toBeEnabled();
  });

  test("3.6 disables inputs while running, re-enables on completion", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();

    expect(minutesInput()).toBeDisabled();
    expect(secondsInput()).toBeDisabled();

    advance(5000); // countdown completes

    expect(minutesInput()).toBeEnabled();
    expect(secondsInput()).toBeEnabled();
  });

  test("3.7 reset restores configured duration after completion, plays interval cue", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();

    expect(resetButton()).toBeDisabled(); // disabled while running

    advance(5000); // countdown completes -> 00:00, idle
    expect(screen.getByText("00:00")).toBeInTheDocument();

    expect(resetButton()).toBeEnabled();
    fireEvent.click(resetButton());

    expect(screen.getByText("00:05")).toBeInTheDocument();
    expect(secondsInput()).toHaveValue(5);
    expect(constructedSrcs).toContain("/audio/interval.mp3");
    expect(secondsInput()).toBeEnabled();
  });

  test("3.8 constructs the expected audio cue sources", async () => {
    render(<Timer />);
    setDuration(0, 1);

    await start();
    expect(constructedSrcs).toContain("/audio/timer-start.mp3");

    advance(1000); // completes
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");

    fireEvent.click(resetButton()); // idle now, reset enabled
    expect(constructedSrcs).toContain("/audio/interval.mp3");
  });

  test("3.9 reset is disabled while running and does not interrupt the countdown", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000); // 00:03
    expect(screen.getByText("00:03")).toBeInTheDocument();

    expect(resetButton()).toBeDisabled();
    fireEvent.click(resetButton()); // no-op while running

    expect(screen.getByText("00:03")).toBeInTheDocument();
    advance(1000); // countdown keeps ticking
    expect(screen.getByText("00:02")).toBeInTheDocument();
  });

  test("3.10 clears the interval after completion", async () => {
    render(<Timer />);
    setDuration(0, 2);
    await start();

    advance(2000); // reaches 00:00 and stops
    expect(screen.getByText("00:00")).toBeInTheDocument();

    advance(5000); // nothing further should change the display
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  test("3.11 pause freezes the display and clears the interval", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000); // 00:03
    expect(screen.getByText("00:03")).toBeInTheDocument();

    fireEvent.click(pauseButton());
    expect(screen.getByText("00:03")).toBeInTheDocument();

    advance(5000); // no tick should be running
    expect(screen.getByText("00:03")).toBeInTheDocument();
  });

  test("3.12 paused digits use the paused (red) colour", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000); // 00:03

    fireEvent.click(pauseButton());

    expect(screen.getByText("00:03")).toHaveClass("text-timer-paused");
  });

  test("3.13 pause plays the interval cue", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(1000);

    fireEvent.click(pauseButton());

    expect(constructedSrcs).toContain("/audio/interval.mp3");
  });

  test("3.14 resume continues from the frozen value, not the configured duration", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000); // 00:03
    fireEvent.click(pauseButton());

    await resume();

    for (const expected of ["00:02", "00:01", "00:00"]) {
      advance(1000);
      expect(screen.getByText(expected)).toBeInTheDocument();
    }
  });

  test("3.15 resume plays the start bell again", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000);
    fireEvent.click(pauseButton());

    await resume();

    expect(
      constructedSrcs.filter((src) => src === "/audio/timer-start.mp3"),
    ).toHaveLength(2);
  });

  test("3.16 inputs are disabled while paused, editable again after reset", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(1000);
    fireEvent.click(pauseButton());

    expect(minutesInput()).toBeDisabled();
    expect(secondsInput()).toBeDisabled();

    fireEvent.click(resetButton());

    expect(minutesInput()).toBeEnabled();
    expect(secondsInput()).toBeEnabled();
  });

  test("3.17 reset is enabled while paused and restores the configured duration", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000); // 00:03
    fireEvent.click(pauseButton());

    expect(resetButton()).toBeEnabled();
    fireEvent.click(resetButton());

    const digits = screen.getByText("00:05");
    expect(digits).toHaveClass("text-timer-idle");
    expect(secondsInput()).toHaveValue(5);
  });

  test("3.18 completion after resume plays the stop cue and returns to idle", async () => {
    render(<Timer />);
    setDuration(0, 3);
    await start();
    advance(1000); // 00:02
    fireEvent.click(pauseButton());
    await resume();

    advance(2000); // 00:00

    const digits = screen.getByText("00:00");
    expect(digits).toHaveClass("text-timer-idle");
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");
    expect(minutesInput()).toBeEnabled();
    expect(secondsInput()).toBeEnabled();
  });

  test("3.19 resume drives exactly one interval (no double-speed)", async () => {
    render(<Timer />);
    setDuration(0, 10);
    await start();
    advance(2000); // 00:08
    fireEvent.click(pauseButton());
    await resume();

    advance(1000);

    expect(screen.getByText("00:07")).toBeInTheDocument();
  });

  // BPR-004 — Pace cue mode.
  test("4.1 fires a beep at each interval cadence, not on the tens display", async () => {
    render(<Timer />);
    setDuration(1, 0); // 01:00
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "20" } });
    await start();

    advance(20000); // 00:40 -> first cadence beep
    expect(beeps()).toBe(1);

    advance(20000); // 00:20 -> second cadence beep
    expect(beeps()).toBe(2);
  });

  test("4.2 does not beep at Start before any tick", async () => {
    render(<Timer />);
    setDuration(1, 0);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "20" } });
    await start();

    expect(beeps()).toBe(0);
  });

  test("4.3 does not beep at completion (stop cue plays instead)", async () => {
    render(<Timer />);
    setDuration(1, 0);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "30" } });
    await start();

    advance(30000); // 00:30 -> one cadence beep
    expect(beeps()).toBe(1);

    advance(30000); // 00:00 -> completion suppresses the beep
    expect(beeps()).toBe(1);
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");
  });

  test("4.4 pace input renders only in Pace mode", () => {
    render(<Timer />);

    expect(offRadio()).toBeChecked();
    expect(screen.queryByLabelText("Pace (sec)")).not.toBeInTheDocument();

    fireEvent.click(paceRadio());
    expect(paceInput()).toBeEnabled();
  });

  test("4.5 cue controls lock while running and unlock after reset", async () => {
    render(<Timer />);
    setDuration(1, 0);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "20" } });
    await start();
    advance(1000); // 00:59, running

    // The base-ui radio is a <span role="radio"> — it exposes its locked state
    // via aria-disabled, not the native `disabled` attribute jest-dom checks.
    expect(paceRadio()).toHaveAttribute("aria-disabled", "true");
    expect(paceInput()).toBeDisabled();

    fireEvent.click(pauseButton());
    fireEvent.click(resetButton()); // back to idle

    expect(paceRadio()).not.toHaveAttribute("aria-disabled", "true");
    expect(paceInput()).toBeEnabled();
  });

  test("4.6 Start is disabled for an invalid Pace interval, enabled for a valid one", () => {
    render(<Timer />);
    setDuration(1, 0); // 01:00
    fireEvent.click(paceRadio());

    fireEvent.change(paceInput(), { target: { value: "0" } });
    expect(startButton()).toBeDisabled();
    expect(paceInput()).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(paceInput(), { target: { value: "" } });
    expect(startButton()).toBeDisabled();
    expect(paceInput()).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(paceInput(), { target: { value: "60" } }); // >= duration
    expect(startButton()).toBeDisabled();

    fireEvent.change(paceInput(), { target: { value: "20" } }); // valid
    expect(startButton()).toBeEnabled();
    expect(paceInput()).toHaveAttribute("aria-invalid", "false");
  });

  test("4.7 reset preserves cue mode and interval", async () => {
    render(<Timer />);
    setDuration(1, 0);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "20" } });
    await start();
    advance(1000);
    fireEvent.click(pauseButton());

    fireEvent.click(resetButton());

    expect(paceRadio()).toBeChecked();
    expect(paceInput()).toHaveValue(20);
  });

  test("4.8 pause mid-cadence then resume keeps the beep cadence", async () => {
    render(<Timer />);
    setDuration(1, 0);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "20" } });
    await start();
    advance(10000); // 00:50
    fireEvent.click(pauseButton()); // constructs an interval.mp3 (pause cue)
    await resume(); // resume bell

    // pause/reset also build /audio/interval.mp3, so count only the delta after
    // resume. Two cadence beeps remain: at 00:40 and 00:20.
    const before = beeps();
    advance(10000); // 00:40 -> cadence beep
    advance(20000); // 00:20 -> cadence beep
    expect(beeps() - before).toBe(2);
  });

  test("4.9 shows an error message for an invalid Pace interval, none for a valid one", () => {
    render(<Timer />);
    setDuration(1, 0); // 01:00
    fireEvent.click(paceRadio());

    // >= duration: range message naming the valid upper bound (total - 1).
    fireEvent.change(paceInput(), { target: { value: "60" } });
    const error = screen.getByText("Enter a whole number from 1 to 59.");
    expect(error).toBeInTheDocument();
    expect(paceInput()).toHaveAttribute("aria-describedby", error.id);

    // Valid interval clears the message.
    fireEvent.change(paceInput(), { target: { value: "20" } });
    expect(
      screen.queryByText("Enter a whole number from 1 to 59."),
    ).not.toBeInTheDocument();
  });

  test("4.10 error message tells the user to lengthen a too-short timer", () => {
    render(<Timer />);
    setDuration(0, 1); // 00:01 — no interval can fit
    fireEvent.click(paceRadio());
    // Enter "2" (not "1": fireEvent.change to a value equal to the input's
    // placeholder is a no-op in jsdom, so use a non-placeholder invalid value).
    fireEvent.change(paceInput(), { target: { value: "2" } });

    expect(
      screen.getByText("Set a timer of at least 2 seconds to use Pace."),
    ).toBeInTheDocument();
  });

  test("4.11 selecting Pace shows no error until a value is entered", () => {
    render(<Timer />);
    setDuration(1, 0); // 01:00
    fireEvent.click(paceRadio());

    // No message and no describedby wiring on a bare selection — but Start is
    // still silently gated until a valid interval is entered.
    expect(paceInput()).not.toHaveAttribute("aria-describedby");
    expect(
      screen.queryByText("Enter a whole number from 1 to 59."),
    ).not.toBeInTheDocument();
    expect(startButton()).toBeDisabled();

    fireEvent.change(paceInput(), { target: { value: "60" } }); // invalid
    expect(
      screen.getByText("Enter a whole number from 1 to 59."),
    ).toBeInTheDocument();
  });
});

// BPR-005 — Random cue mode. randomGap reads Math.random, so each cadence test
// stubs it deterministically; the scoped afterEach restores the spy (the global
// afterEach only unstubs globals, it does not restore vi.spyOn spies).
describe("Timer — random cue (BPR-005)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("5.1 the Random radio is selectable and reveals Min/Max inputs", () => {
    render(<Timer />);

    fireEvent.click(randomRadio());

    expect(randomRadio()).toBeChecked();
    expect(minInput()).toBeInTheDocument();
    expect(maxInput()).toBeInTheDocument();
  });

  test("5.2 Min/Max inputs render only in Random mode", () => {
    render(<Timer />);

    expect(screen.queryByLabelText("Min (sec)")).not.toBeInTheDocument();

    fireEvent.click(paceRadio());
    expect(screen.queryByLabelText("Min (sec)")).not.toBeInTheDocument();

    fireEvent.click(randomRadio());
    expect(minInput()).toBeEnabled();
    expect(maxInput()).toBeEnabled();
  });

  test("5.3 fires a cue after each random gap", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // gap === min === 2 every draw
    render(<Timer />);
    setDuration(0, 10);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();

    advance(2000); // first gap (2s)
    expect(beeps()).toBe(1);

    advance(2000); // second gap (2s)
    expect(beeps()).toBe(2);
  });

  test("5.4 does not cue at Start before any tick", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // gap === min === 2
    render(<Timer />);
    setDuration(0, 10);
    fireEvent.click(randomRadio());
    // min "2" (not "1": entering a value equal to the input placeholder is a
    // jsdom fireEvent no-op). The earliest cue is still one gap after Start.
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();

    expect(beeps()).toBe(0);
  });

  test("5.5 re-randomises the gap after each cue", async () => {
    // bounds [2,4], span 3: Math.random 0 -> gap 2, 0.9 -> gap 4.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0) // start seed -> 2
      .mockReturnValueOnce(0.9) // reseed after first cue -> 4
      .mockReturnValue(0.9);
    render(<Timer />);
    setDuration(0, 10);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();

    advance(2000); // elapsed 2 -> first cue
    expect(beeps()).toBe(1);

    advance(2000); // elapsed 4 -> NOT yet (second gap is 4, not 2)
    expect(beeps()).toBe(1);

    advance(2000); // elapsed 6 -> second cue
    expect(beeps()).toBe(2);
  });

  test("5.6 does not cue at completion (stop cue plays instead)", async () => {
    // bounds [2,3]: seed gap 2, reseed gap 3 -> would land at elapsed 5 == 00:00.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0) // -> 2
      .mockReturnValueOnce(0.9) // -> 3
      .mockReturnValue(0.9);
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "3" } });
    await start();

    advance(2000); // elapsed 2 -> one cue
    expect(beeps()).toBe(1);

    advance(3000); // elapsed 5 -> completion suppresses the scheduled cue
    expect(beeps()).toBe(1);
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");
  });

  test("5.6b the largest valid gap still cues at one second remaining", async () => {
    // bounds [3,4], span 2: Math.random 0.9 -> gap 4, landing at elapsed 4 (00:01).
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "3" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();

    advance(4000); // elapsed 4 -> remaining 1 -> cue fires
    expect(beeps()).toBe(1);

    advance(1000); // elapsed 5 -> completion, no further cue
    expect(beeps()).toBe(1);
  });

  test("5.7 Start is disabled and both inputs invalid for bad bounds", () => {
    render(<Timer />);
    setDuration(0, 10); // total 10
    fireEvent.click(randomRadio());

    // blank/zero bounds
    expect(startButton()).toBeDisabled();
    expect(minInput()).toHaveAttribute("aria-invalid", "true");
    expect(maxInput()).toHaveAttribute("aria-invalid", "true");

    // upper not strictly above lower
    fireEvent.change(minInput(), { target: { value: "5" } });
    fireEvent.change(maxInput(), { target: { value: "5" } });
    expect(startButton()).toBeDisabled();

    // upper equals the total
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "10" } });
    expect(startButton()).toBeDisabled();

    // valid bounds
    fireEvent.change(maxInput(), { target: { value: "5" } });
    expect(startButton()).toBeEnabled();
    expect(minInput()).toHaveAttribute("aria-invalid", "false");
    expect(maxInput()).toHaveAttribute("aria-invalid", "false");
  });

  test("5.8 shows a guiding error for invalid bounds, none for valid", () => {
    render(<Timer />);
    setDuration(0, 10); // total 10 -> valid range 1..9
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "5" } });
    fireEvent.change(maxInput(), { target: { value: "5" } });

    const error = screen.getByText(
      "Enter whole numbers with 1 ≤ Min < Max ≤ 9.",
    );
    expect(error).toBeInTheDocument();
    expect(minInput()).toHaveAttribute("aria-describedby", error.id);
    expect(maxInput()).toHaveAttribute("aria-describedby", error.id);

    fireEvent.change(maxInput(), { target: { value: "8" } });
    expect(
      screen.queryByText("Enter whole numbers with 1 ≤ Min < Max ≤ 9."),
    ).not.toBeInTheDocument();
  });

  test("5.8b error tells the user to lengthen a too-short timer", () => {
    render(<Timer />);
    setDuration(0, 2); // total 2 -> no room for 1 <= min < max < 2
    fireEvent.click(randomRadio());
    // Non-placeholder values so the change registers; any entry is invalid here.
    fireEvent.change(minInput(), { target: { value: "3" } });
    fireEvent.change(maxInput(), { target: { value: "5" } });

    expect(
      screen.getByText("Set a timer of at least 3 seconds to use Random."),
    ).toBeInTheDocument();
  });

  test("5.8c selecting Random shows no error until a value is entered", () => {
    render(<Timer />);
    setDuration(0, 10); // total 10
    fireEvent.click(randomRadio());

    // No message on a bare selection, but Start stays silently gated.
    expect(minInput()).not.toHaveAttribute("aria-describedby");
    expect(maxInput()).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(/Enter whole numbers/)).not.toBeInTheDocument();
    expect(startButton()).toBeDisabled();

    fireEvent.change(minInput(), { target: { value: "5" } });
    fireEvent.change(maxInput(), { target: { value: "5" } }); // invalid
    expect(
      screen.getByText("Enter whole numbers with 1 ≤ Min < Max ≤ 9."),
    ).toBeInTheDocument();
  });

  test("5.9 selecting Random deselects Pace and vice versa", () => {
    render(<Timer />);

    fireEvent.click(paceRadio());
    expect(paceRadio()).toBeChecked();

    fireEvent.click(randomRadio());
    expect(randomRadio()).toBeChecked();
    expect(paceRadio()).not.toBeChecked();

    fireEvent.click(paceRadio());
    expect(paceRadio()).toBeChecked();
    expect(randomRadio()).not.toBeChecked();
  });

  test("5.9b switching to Normal clears the random cadence", async () => {
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    fireEvent.click(offRadio()); // back to Normal — no cue mode active
    await start();

    advance(5000); // full countdown
    expect(beeps()).toBe(0);
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");
  });

  test("5.10 selector and bound inputs lock while running, unlock after reset", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Timer />);
    setDuration(0, 10);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();
    advance(1000); // running

    expect(randomRadio()).toHaveAttribute("aria-disabled", "true");
    expect(minInput()).toBeDisabled();
    expect(maxInput()).toBeDisabled();

    fireEvent.click(pauseButton());
    fireEvent.click(resetButton()); // back to idle

    expect(randomRadio()).not.toHaveAttribute("aria-disabled", "true");
    expect(minInput()).toBeEnabled();
    expect(maxInput()).toBeEnabled();
  });

  test("5.11 reset preserves bounds and re-randomises the next Start", async () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0); // first run: gap 2
    render(<Timer />);
    setDuration(0, 10);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();
    advance(2000); // a cue at the first (gap 2) tick
    fireEvent.click(pauseButton());

    fireEvent.click(resetButton());

    // Settings survive the reset.
    expect(randomRadio()).toBeChecked();
    expect(minInput()).toHaveValue(2);
    expect(maxInput()).toHaveValue(4);

    // A fresh Start re-draws the gap — now 4 (0.9 over span 3), so no cue at
    // elapsed 2, one cue at elapsed 4. Count the delta since reset/pause also
    // construct /audio/interval.mp3.
    rand.mockReturnValue(0.9);
    const before = beeps();
    await start();

    advance(2000); // elapsed 2 -> nothing (gap is now 4)
    expect(beeps() - before).toBe(0);

    advance(2000); // elapsed 4 -> one cue
    expect(beeps() - before).toBe(1);
  });
});

// BPR-006 — Violet flash overlay on cue beeps. Reuses the AudioMock harness:
// fireCue() constructs /audio/interval.mp3 AND (when enabled and not reduced
// motion) lights the data-testid="flash-overlay" for 200ms. The overlay reflects
// its lit state via opacity-100 (lit) / opacity-0 (unlit). Beeps are always >= 1s
// apart, while the flash window is 200ms, so the two-step "advance to the beep
// tick (lit), then advance 200ms (unlit)" pattern observes both states cleanly.
describe("Timer — visual flash (BPR-006)", () => {
  // Random-cue cases stub Math.random; restore it like the BPR-005 block.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const flashCheckbox = () =>
    screen.getByRole("checkbox", { name: "Visual flash" });
  const overlay = () => screen.getByTestId("flash-overlay");

  test("6.1 the Visual flash checkbox is present and toggles", () => {
    render(<Timer />);

    expect(flashCheckbox()).not.toBeChecked();
    fireEvent.click(flashCheckbox());
    expect(flashCheckbox()).toBeChecked();
    fireEvent.click(flashCheckbox());
    expect(flashCheckbox()).not.toBeChecked();
  });

  test("6.2 lights on a Pace cue beep and clears after 200ms", async () => {
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "1" } });
    fireEvent.click(flashCheckbox());
    await start();

    advance(1000); // elapsed 1 -> first pace beep
    expect(beeps()).toBe(1);
    expect(overlay()).toHaveClass("opacity-100");

    advance(200); // flash-clear timeout fires
    expect(overlay()).toHaveClass("opacity-0");
  });

  test("6.3 lights on a Random cue beep and clears after 200ms", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // gap === min === 2
    render(<Timer />);
    setDuration(0, 10);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    fireEvent.click(flashCheckbox());
    await start();

    advance(2000); // first random gap (2s) -> beep
    expect(beeps()).toBe(1);
    expect(overlay()).toHaveClass("opacity-100");

    advance(200); // flash-clear timeout fires
    expect(overlay()).toHaveClass("opacity-0");
  });

  // Re-trigger: each successive beep re-lights the overlay (lit -> unlit ->
  // lit). NOTE: two beeps literally <200ms apart is unreachable — the countdown
  // spaces beeps >= 1s apart, so the pending 200ms flash timeout has always
  // already fired before the next beep. fireCue still runs its clearTimeout +
  // reschedule path on every beep here (clearing an already-fired timer), but the
  // "stay lit straight through an overlapping cue" branch cannot be exercised via
  // the countdown. Flagged in the report.
  test("6.4 re-lights the overlay on each successive Pace beep", async () => {
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "1" } });
    fireEvent.click(flashCheckbox());
    await start();

    advance(1000); // elapsed 1 -> beep
    expect(overlay()).toHaveClass("opacity-100");
    advance(200);
    expect(overlay()).toHaveClass("opacity-0");

    advance(800); // elapsed 2 -> next beep
    expect(overlay()).toHaveClass("opacity-100");
    advance(200);
    expect(overlay()).toHaveClass("opacity-0");

    advance(800); // elapsed 3 -> next beep
    expect(overlay()).toHaveClass("opacity-100");
  });

  test("6.5 does not light when unchecked, but the beep still plays", async () => {
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "1" } });
    // Visual flash left unchecked.
    await start();

    advance(1000); // elapsed 1 -> beep
    expect(beeps()).toBe(1);
    expect(constructedSrcs).toContain("/audio/interval.mp3");
    expect(overlay()).toHaveClass("opacity-0");
  });

  test("6.6 Reset plays the interval cue but does not light the overlay", () => {
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(flashCheckbox()); // even with flash enabled
    fireEvent.click(resetButton()); // idle -> Reset is enabled

    expect(constructedSrcs).toContain("/audio/interval.mp3");
    expect(overlay()).toHaveClass("opacity-0");
  });

  test("6.7 suppresses the flash under reduced motion, audio still plays", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: true,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }));
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "1" } });
    fireEvent.click(flashCheckbox());
    await start();

    advance(1000); // elapsed 1 -> beep, but reduced motion suppresses the flash
    expect(beeps()).toBe(1);
    expect(constructedSrcs).toContain("/audio/interval.mp3");
    expect(overlay()).toHaveClass("opacity-0");
  });

  test("6.8 checkbox disables while running and its checked state survives Reset", async () => {
    render(<Timer />);
    setDuration(0, 5);
    fireEvent.click(flashCheckbox());
    expect(flashCheckbox()).toBeChecked();
    // The base-ui checkbox is a <span role="checkbox"> — it exposes its locked
    // state via aria-disabled, not the native `disabled` attribute (same as the
    // radios in tests 4.5 / 5.10).
    expect(flashCheckbox()).not.toHaveAttribute("aria-disabled", "true");

    await start();
    expect(flashCheckbox()).toHaveAttribute("aria-disabled", "true"); // running

    advance(2000);
    fireEvent.click(pauseButton());
    expect(flashCheckbox()).toHaveAttribute("aria-disabled", "true"); // paused

    fireEvent.click(resetButton()); // back to idle
    expect(flashCheckbox()).not.toHaveAttribute("aria-disabled", "true");
    expect(flashCheckbox()).toBeChecked(); // setting preserved across Reset
  });

  test("6.9 the overlay is non-interactive (pointer-events-none)", () => {
    render(<Timer />);
    expect(overlay()).toHaveClass("pointer-events-none");
  });
});
