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

// In Rounds mode the Rest inputs share the "Minutes"/"Seconds" accessible names
// with the work inputs. The work (Work-round) section always renders before the
// Rest section, so index [0] is the work pair; the Rest helpers take index [1].
const minutesInput = () => screen.getAllByLabelText("Minutes")[0];
const secondsInput = () => screen.getAllByLabelText("Seconds")[0];
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
    // bounds [2,4]: Math.random 0 -> gap 2.0, 0.999999 -> gap 4.0.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0) // start seed -> 2
      .mockReturnValueOnce(0.999999) // reseed after first cue -> 4
      .mockReturnValue(0.999999);
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
      .mockReturnValueOnce(0.999999) // -> 3
      .mockReturnValue(0.999999);
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
    // bounds [3,4]: Math.random 0.999999 -> gap 4, landing at elapsed 4 (00:01).
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
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

    // A fresh Start re-draws the gap — now 4 (0.999999 over [2,4]), so no cue at
    // elapsed 2, one cue at elapsed 4. Count the delta since reset/pause also
    // construct /audio/interval.mp3.
    rand.mockReturnValue(0.999999);
    const before = beeps();
    await start();

    advance(2000); // elapsed 2 -> nothing (gap is now 4)
    expect(beeps() - before).toBe(0);

    advance(2000); // elapsed 4 -> one cue
    expect(beeps() - before).toBe(1);
  });

  test("5.12 fires on a sub-second gap that the old whole-second engine could not", async () => {
    // bounds [2,4]: Math.random 0.15 -> floor(0.15*21)=3 tenths over min -> gap 2.3s.
    vi.spyOn(Math, "random").mockReturnValue(0.15);
    render(<Timer />);
    setDuration(0, 10);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();

    advance(2200); // elapsed 2.2s (22 ticks) -> gap not yet reached
    expect(beeps()).toBe(0);

    advance(100); // elapsed 2.3s (23 ticks) -> cue fires
    expect(beeps()).toBe(1);
  });
});

// BPR-006 — Violet flash overlay on cue beeps. Reuses the AudioMock harness:
// fireCue() constructs /audio/interval.mp3 AND (when enabled and not reduced
// motion) lights the data-testid="flash-overlay" for 100ms. The overlay reflects
// its lit state via opacity-100 (lit) / opacity-0 (unlit). Beeps are always >= 1s
// apart, while the flash window is 100ms, so the two-step "advance to the beep
// tick (lit), then advance 100ms (unlit)" pattern observes both states cleanly.
describe("Timer — visual flash (BPR-006)", () => {
  // Random-cue cases stub Math.random; restore it like the BPR-005 block.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const flashCheckbox = () =>
    screen.getByRole("checkbox", { name: "Flash at beep" });
  const overlay = () => screen.getByTestId("flash-overlay");

  test("6.1 the Visual flash checkbox appears outside Normal mode and toggles", () => {
    render(<Timer />);
    // Hidden in Normal mode — there is no cue to flash.
    expect(screen.queryByRole("checkbox", { name: "Flash at beep" })).toBeNull();

    fireEvent.click(paceRadio());
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

    advance(100); // flash-clear timeout fires
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

    advance(100); // flash-clear timeout fires
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
    advance(100);
    expect(overlay()).toHaveClass("opacity-0");

    advance(900); // elapsed 2 -> next beep
    expect(overlay()).toHaveClass("opacity-100");
    advance(100);
    expect(overlay()).toHaveClass("opacity-0");

    advance(900); // elapsed 3 -> next beep
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
    fireEvent.click(paceRadio()); // reveal the flash toggle
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
    fireEvent.click(paceRadio()); // reveal the flash toggle
    fireEvent.change(paceInput(), { target: { value: "1" } }); // valid interval so Start works
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

  test("6.10 switching back to Normal hides and clears the flash toggle", () => {
    render(<Timer />);
    fireEvent.click(paceRadio());
    fireEvent.click(flashCheckbox());
    expect(flashCheckbox()).toBeChecked();

    // Selecting Normal removes the toggle and its state cannot linger true.
    fireEvent.click(offRadio());
    expect(screen.queryByRole("checkbox", { name: "Flash at beep" })).toBeNull();

    // Re-entering a cue mode shows the toggle unchecked, not the stale value.
    fireEvent.click(paceRadio());
    expect(flashCheckbox()).not.toBeChecked();
  });
});

describe("Timer — round-based training (BPR-008)", () => {
  // The checkbox and the round-count input both carry the "Rounds" label; the
  // checkbox is a <span role="checkbox">, the count a number <input> (spinbutton),
  // so the role disambiguates them. Rest inputs resolve by their distinct labels.
  const roundsCheckbox = () => screen.getByRole("checkbox", { name: "Rounds" });
  const roundCountInput = () =>
    screen.getByRole("spinbutton", { name: "Rounds" });
  // The Rest inputs mirror the Work layout and share the "Minutes"/"Seconds"
  // accessible names. Rest renders after Work, so it is the second match.
  const restMinInput = () => screen.getAllByLabelText("Minutes")[1];
  const restSecInput = () => screen.getAllByLabelText("Seconds")[1];
  // The session phase indicator is the <span> reading "Work"/"Rest". Rounds mode
  // also renders a "Work" duration <label> above Minutes/Seconds, so scope the
  // phase query to the span to keep the two "Work" texts unambiguous.
  const phaseText = () =>
    screen.getByText(/^(Work|Rest)$/, { selector: "span" });

  const starts = () =>
    constructedSrcs.filter((s) => s === "/audio/timer-start.mp3").length;
  const stops = () =>
    constructedSrcs.filter((s) => s === "/audio/timer-stop.mp3").length;
  const roundStarts = () =>
    constructedSrcs.filter((s) => s === "/audio/round-start.mp3").length;

  const enableRounds = () => fireEvent.click(roundsCheckbox());
  const setRounds = (n: number) =>
    fireEvent.change(roundCountInput(), { target: { value: String(n) } });
  const setRest = (min: number, sec: number) => {
    fireEvent.change(restMinInput(), { target: { value: String(min) } });
    fireEvent.change(restSecInput(), { target: { value: String(sec) } });
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("8.1 rounds off leaves the single-timer path unchanged", async () => {
    render(<Timer />);
    setDuration(0, 5);
    // No rounds UI while the toggle is unchecked.
    expect(screen.queryByRole("spinbutton", { name: "Rounds" })).toBeNull();
    // Only the single work Minutes input exists — no Rest section yet.
    expect(screen.getAllByLabelText("Minutes")).toHaveLength(1);

    await start();
    advance(1000); // running mid-countdown
    const running = screen.getByText("00:04");
    expect(running).toHaveClass("text-timer-active"); // not amber/rounds colour
    expect(screen.queryByText(/Round \d+ \/ \d+/)).toBeNull();

    advance(4000);
    const done = screen.getByText("00:00");
    expect(done).toHaveClass("text-timer-idle");
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");
  });

  test("8.2 the Rounds toggle is available in every cue mode", () => {
    render(<Timer />);
    expect(roundsCheckbox()).toBeInTheDocument();
    fireEvent.click(paceRadio());
    expect(roundsCheckbox()).toBeInTheDocument();
    fireEvent.click(randomRadio());
    expect(roundsCheckbox()).toBeInTheDocument();
    fireEvent.click(offRadio());
    expect(roundsCheckbox()).toBeInTheDocument();
  });

  test("8.3 enabling Rounds reveals the count (default 1), rest inputs, and a Work label", () => {
    render(<Timer />);
    // Only the work Minutes input, and no "Work round" heading, until enabled.
    expect(screen.getAllByLabelText("Minutes")).toHaveLength(1);
    expect(screen.queryByText("Work round")).toBeNull();

    enableRounds();
    expect(roundsCheckbox()).toBeChecked();
    expect(roundCountInput()).toHaveValue(1); // default shown as 1
    expect(restMinInput()).toBeInTheDocument();
    expect(restSecInput()).toBeInTheDocument();
    // The Rest section is revealed, so a second Minutes input now exists.
    expect(screen.getAllByLabelText("Minutes")).toHaveLength(2);
    // The Minutes/Seconds pair is now headed as the work-round duration.
    expect(screen.getByText("Work round")).toBeInTheDocument();
    // Rest seconds clamp to 0–59 like the work seconds input.
    fireEvent.change(restSecInput(), { target: { value: "75" } });
    expect(restSecInput()).toHaveValue(59);
  });

  test("8.4 round config locks while running and unlocks after Reset", async () => {
    render(<Timer />);
    setDuration(0, 3);
    enableRounds();
    setRounds(2);
    setRest(0, 2);
    expect(roundCountInput()).not.toBeDisabled();

    await start();
    advance(500); // into Work(1)
    expect(roundsCheckbox()).toHaveAttribute("aria-disabled", "true");
    expect(roundCountInput()).toBeDisabled();
    expect(restMinInput()).toBeDisabled();
    expect(restSecInput()).toBeDisabled();

    fireEvent.click(pauseButton());
    fireEvent.click(resetButton());
    expect(roundsCheckbox()).not.toHaveAttribute("aria-disabled", "true");
    expect(roundCountInput()).not.toBeDisabled();
  });

  test("8.5 idle with Rounds on previews the work duration in idle grey + Round 1/N", () => {
    render(<Timer />);
    setDuration(0, 3);
    enableRounds();
    setRounds(3);
    const digits = screen.getByText("00:03");
    expect(digits).toHaveClass("text-timer-idle"); // idle grey preview
    expect(screen.getByText("Round 1 / 3")).toBeInTheDocument();
    // No phase indicator before Start (the "Work" duration label is a <label>,
    // not the phase <span>, so scope the query to the span).
    expect(
      screen.queryByText(/^(Work|Rest)$/, { selector: "span" }),
    ).toBeNull();
  });

  test("8.6 runs Work → Rest → Work with no Ready stage and no trailing rest (N=2)", async () => {
    render(<Timer />);
    setDuration(0, 3); // work
    enableRounds();
    setRounds(2);
    setRest(0, 2);
    await start();

    // Work(1) starts immediately — there is no Ready countdown.
    expect(phaseText()).toHaveTextContent("Work");
    expect(screen.getByText("Round 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("00:03")).toBeInTheDocument();

    advance(3000); // Work(1) -> Rest (upcoming round shown)
    expect(phaseText()).toHaveTextContent("Rest");
    expect(screen.getByText("Round 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("00:02")).toBeInTheDocument();

    advance(2000); // Rest -> Work(2)
    expect(phaseText()).toHaveTextContent("Work");
    expect(screen.getByText("Round 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("00:03")).toBeInTheDocument();

    advance(3000); // Work(2) -> complete, no trailing rest
    const done = screen.getByText("00:00");
    expect(done).toHaveClass("text-timer-idle");
    expect(screen.queryByText(/Round \d+ \/ \d+/)).toBeNull();
    expect(
      screen.queryByText(/^(Work|Rest)$/, { selector: "span" }),
    ).toBeNull();
  });

  test("8.7 a single round runs just Work with no rest phase (N=1)", async () => {
    render(<Timer />);
    setDuration(0, 3);
    enableRounds();
    setRounds(1);
    await start();

    // Work(1) starts immediately — no Ready stage.
    expect(phaseText()).toHaveTextContent("Work");
    expect(screen.getByText("Round 1 / 1")).toBeInTheDocument();
    expect(screen.getByText("00:03")).toBeInTheDocument();

    advance(3000); // -> complete
    expect(screen.getByText("00:00")).toBeInTheDocument();
    // No Rest phase ever appeared.
    expect(screen.queryByText(/^Rest$/, { selector: "span" })).toBeNull();
  });

  test("8.8 digits are Emerald in Work, Amber in Rest, and Red when paused", async () => {
    render(<Timer />);
    setDuration(0, 3);
    enableRounds();
    setRounds(2);
    setRest(0, 2);
    await start();

    expect(screen.getByText("00:03")).toHaveClass("text-timer-active"); // Work

    fireEvent.click(pauseButton()); // paused during Work
    expect(screen.getByText("00:03")).toHaveClass("text-timer-paused");

    await resume();
    advance(3000); // Work -> Rest
    expect(screen.getByText("00:02")).toHaveClass("text-timer-rest");
  });

  test("8.9 session start rings only the start bell (no round cue); later Work entries ring round-start; leaving Work rings stop (N=2)", async () => {
    render(<Timer />);
    setDuration(0, 3);
    enableRounds();
    setRounds(2);
    setRest(0, 2);
    await start();
    // Session start (round 1) plays the start bell only — the round-start cue is
    // suppressed for the first work round.
    expect(constructedSrcs).toContain("/audio/timer-start.mp3");
    expect(constructedSrcs).not.toContain("/audio/round-start.mp3");
    expect(starts()).toBe(1);
    expect(roundStarts()).toBe(0); // round 1 does NOT ring the round cue
    expect(stops()).toBe(0);

    advance(3000); // Work(1) -> Rest: stop bell, still no round cue
    expect(stops()).toBe(1);
    expect(roundStarts()).toBe(0);

    advance(2000); // Rest -> Work(2): round-start rings for round 2
    expect(roundStarts()).toBe(1);
    expect(starts()).toBe(1); // session start bell rang only once

    advance(3000); // Work(2) -> complete: stop bell
    expect(stops()).toBe(2);
    expect(roundStarts()).toBe(1); // only rounds 2..N ring round-start
  });

  test("8.10 N=1 rings one start bell, no round-start, one stop bell", async () => {
    render(<Timer />);
    setDuration(0, 3);
    enableRounds();
    setRounds(1);
    await start();
    // Round 1 is the only round: start bell rings, round-start never does.
    expect(constructedSrcs).not.toContain("/audio/round-start.mp3");

    advance(3000); // Work(1) -> complete
    expect(starts()).toBe(1);
    expect(roundStarts()).toBe(0);
    expect(stops()).toBe(1);
  });

  test("8.11 Pace cues fire in every Work phase only, never in Rest", async () => {
    render(<Timer />);
    setDuration(0, 4); // work
    enableRounds();
    setRounds(2);
    setRest(0, 3);
    fireEvent.click(paceRadio());
    fireEvent.change(paceInput(), { target: { value: "1" } }); // 1s, < 4s work
    await start();

    expect(beeps()).toBe(0); // no beep at Work(1) start

    advance(3000); // Work(1) elapsed 3s -> beeps at 1,2,3
    expect(beeps()).toBe(3);

    advance(1000); // Work(1) 00:00 -> Rest; no beep at the phase boundary
    expect(beeps()).toBe(3);

    advance(3000); // Rest: silent
    expect(beeps()).toBe(3);

    advance(3000); // Work(2) elapsed 3s -> schedule restarts, beeps at 1,2,3
    expect(beeps()).toBe(6);

    advance(1000); // Work(2) 00:00 -> complete; no beep at 00:00
    expect(beeps()).toBe(6);
  });

  test("8.12 Random cues fire in Work only (gap re-seeds each Work phase)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // gap === min === 2s
    render(<Timer />);
    setDuration(0, 5); // work
    enableRounds();
    setRounds(2);
    setRest(0, 3);
    fireEvent.click(randomRadio());
    fireEvent.change(minInput(), { target: { value: "2" } });
    fireEvent.change(maxInput(), { target: { value: "4" } });
    await start();

    advance(2000); // Work(1) elapsed 2s -> first cue
    expect(beeps()).toBe(1);

    advance(3000); // finish Work(1) (5s) -> Rest; elapsed-4s cue fired, none at 00:00
    expect(beeps()).toBe(2);

    advance(3000); // Rest: silent
    expect(beeps()).toBe(2);

    advance(2000); // Work(2) elapsed 2s -> next cue (gap re-seeded)
    expect(beeps()).toBe(3);
  });

  test("8.13 Pause freezes the session; Resume continues the same phase", async () => {
    render(<Timer />);
    setDuration(0, 4); // work
    enableRounds();
    setRounds(2);
    setRest(0, 2);
    await start();
    advance(1000); // Work(1) 00:03

    fireEvent.click(pauseButton());
    expect(screen.getByText("00:03")).toHaveClass("text-timer-paused");
    expect(phaseText()).toHaveTextContent("Work");
    expect(screen.getByText("Round 1 / 2")).toBeInTheDocument();
    expect(constructedSrcs).toContain("/audio/interval.mp3");

    advance(5000); // paused: nothing advances
    expect(screen.getByText("00:03")).toBeInTheDocument();

    await resume();
    advance(3000); // the remaining 3s of Work(1) -> Rest
    expect(phaseText()).toHaveTextContent("Rest");
    expect(screen.getByText("Round 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("00:02")).toBeInTheDocument();
  });

  test("8.14 Reset returns to idle, restores work duration, preserves settings", async () => {
    render(<Timer />);
    setDuration(0, 4);
    enableRounds();
    setRounds(3);
    setRest(0, 2);
    await start();
    advance(3000); // Work(1), 00:01
    fireEvent.click(pauseButton());

    fireEvent.click(resetButton());
    const digits = screen.getByText("00:04"); // restored work duration
    expect(digits).toHaveClass("text-timer-idle"); // idle grey, not the rest/ready Amber
    expect(screen.getByText("Round 1 / 3")).toBeInTheDocument();
    expect(roundsCheckbox()).toBeChecked(); // settings preserved
    expect(roundCountInput()).toHaveValue(3);
    expect(restSecInput()).toHaveValue(2);
    expect(constructedSrcs).toContain("/audio/interval.mp3");
    expect(roundCountInput()).not.toBeDisabled(); // config re-enabled
  });

  test("8.15 no interval leaks after completion or unmount", async () => {
    const { unmount } = render(<Timer />);
    setDuration(0, 3);
    enableRounds();
    setRounds(1);
    await start();
    advance(3000); // Work(1) -> complete
    expect(screen.getByText("00:00")).toBeInTheDocument();

    const afterComplete = constructedSrcs.length;
    advance(5000); // nothing should keep firing
    expect(constructedSrcs.length).toBe(afterComplete);
    expect(screen.getByText("00:00")).toBeInTheDocument();

    unmount();
    const afterUnmount = constructedSrcs.length;
    advance(5000);
    expect(constructedSrcs.length).toBe(afterUnmount);
  });
});
