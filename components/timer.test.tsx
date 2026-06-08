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
const resetButton = () => screen.getByRole("button", { name: "Reset" });

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

  test("3.3 marks completion with stopped colour, stop cue, enabled inputs", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();

    advance(5000); // exactly five ticks -> 00:00, before the 1000ms idle reset

    const digits = screen.getByText("00:00");
    expect(digits).toHaveClass("text-timer-stopped");
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

  test("3.5 disables Start when empty and while running", async () => {
    render(<Timer />);
    expect(startButton()).toBeDisabled();

    setDuration(0, 5);
    expect(startButton()).toBeEnabled();

    await start();
    expect(startButton()).toBeDisabled();
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

  test("3.7 reset restores configured duration, keeps inputs, plays interval cue", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000); // 00:03
    expect(screen.getByText("00:03")).toBeInTheDocument();

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

    fireEvent.click(resetButton());
    expect(constructedSrcs).toContain("/audio/interval.mp3");

    await start();
    advance(1000); // completes
    expect(constructedSrcs).toContain("/audio/timer-stop.mp3");
  });

  test("3.9 clears the interval after reset", async () => {
    render(<Timer />);
    setDuration(0, 5);
    await start();
    advance(2000); // 00:03
    fireEvent.click(resetButton());
    expect(screen.getByText("00:05")).toBeInTheDocument();

    advance(5000); // no ticks should fire after reset
    expect(screen.getByText("00:05")).toBeInTheDocument();
  });

  test("3.9 clears the interval after completion", async () => {
    render(<Timer />);
    setDuration(0, 2);
    await start();

    advance(2000); // reaches 00:00 (stopped)
    advance(1000); // idle reset fires
    expect(screen.getByText("00:00")).toBeInTheDocument();

    advance(5000); // nothing further should change the display
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });
});
