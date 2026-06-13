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

    expect(
      screen.getByText("Set a timer of at least 2 seconds to use Pace."),
    ).toBeInTheDocument();
  });
});
