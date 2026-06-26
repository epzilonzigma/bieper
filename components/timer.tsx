"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isValidInterval, isValidRandomBounds, randomGap } from "@/lib/timer-cues";

type Status = "idle" | "running" | "paused";
type CueMode = "off" | "pace" | "random";

const digitColor: Record<Status, string> = {
  idle: "text-timer-idle",
  running: "text-timer-active",
  paused: "text-timer-paused",
};

const formatTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const play = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch((err) => {console.log(err)});
};

export const Timer = () => {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [cueMode, setCueMode] = useState<CueMode>("off");
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  const [lowerBound, setLowerBound] = useState(0);
  const [upperBound, setUpperBound] = useState(0);
  const [visualFlashEnabled, setVisualFlashEnabled] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);
  // Cue settings the running tick reads. Seeded at Start only (controls are
  // locked while non-idle, so they cannot drift), which keeps the beep schedule
  // correct across pause/resume since `beginTick` re-runs but never re-seeds.
  const cueModeRef = useRef<CueMode>("off");
  const paceIntervalRef = useRef(0);
  const lowerBoundRef = useRef(0);
  const upperBoundRef = useRef(0);
  // Seconds until the next cue fires. Shared by both cue modes: Pace reseeds it
  // with the fixed interval, Random reseeds it with a fresh random gap.
  const nextCueRef = useRef(0);
  // Visual-flash toggle captured at Start so the running tick reads a value that
  // cannot change mid-run, plus the id of the pending flash-clear timeout.
  const visualFlashRef = useRef(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const configuredTotal = minutes * 60 + seconds; // what value to count down from?
  const isRunning = status === "running";
  const paceInvalid =
    cueMode === "pace" && !isValidInterval(intervalSeconds, configuredTotal);
  // Only surface the message once the user has actually entered a value (a
  // blank input reads as 0); selecting the mode alone never pops an error.
  const paceError = !paceInvalid || intervalSeconds === 0
    ? null
    : configuredTotal < 2
      ? "Set a timer of at least 2 seconds to use Pace."
      : `Enter a whole number from 1 to ${configuredTotal - 1}.`;
  const randomInvalid =
    cueMode === "random" &&
    !isValidRandomBounds(lowerBound, upperBound, configuredTotal);
  const randomEntered = lowerBound !== 0 || upperBound !== 0;
  const randomError = !randomInvalid || !randomEntered
    ? null
    : configuredTotal < 3
      ? "Set a timer of at least 3 seconds to use Random."
      : `Enter whole numbers with 1 ≤ Min < Max ≤ ${configuredTotal - 1}.`;

  const clearTick = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearFlash = () => {
    if (flashTimeoutRef.current !== null) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    setFlashing(false);
  };

  // Dedicated call site for cue beeps (Pace / Random), kept separate from the
  // generic play() used by Start/Reset/Pause so the visual flash hooks cue beeps
  // only. The audio always plays; the flash lights only when enabled and the OS
  // is not requesting reduced motion. Overlapping cues restart the 200 ms window.
  const fireCue = () => {
    const audio = new Audio("/audio/interval.mp3");
    audio.play().catch((err) => {console.log(err)});
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (visualFlashRef.current && !reducedMotion) {
      if (flashTimeoutRef.current !== null) {
        clearTimeout(flashTimeoutRef.current);
      }
      setFlashing(true);
      flashTimeoutRef.current = setTimeout(() => setFlashing(false), 200);
    }
  };

  const beginTick = () => {
    clearTick();
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearTick();
        clearFlash();
        play("/audio/timer-stop.mp3");
        setStatus("idle");
      } else if (cueModeRef.current !== "off") {
        // Single countdown shared by both cue modes; only the reseed differs.
        // Sits after the completion guard, so no cue ever fires at 00:00.
        nextCueRef.current -= 1;
        if (nextCueRef.current === 0) {
          fireCue();
          nextCueRef.current =
            cueModeRef.current === "pace"
              ? paceIntervalRef.current
              : randomGap(lowerBoundRef.current, upperBoundRef.current);
        }
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearTick();
      clearFlash();
    };
  }, []);

  const handleMinutes = (value: string) => {
    const parsed = Math.max(0, Math.floor(Number(value) || 0));
    setMinutes(parsed);
    setRemaining(parsed * 60 + seconds);
  };

  const handleSeconds = (value: string) => {
    const parsed = Math.min(59, Math.max(0, Math.floor(Number(value) || 0)));
    setSeconds(parsed);
    setRemaining(minutes * 60 + parsed);
  };

  // Play the start bell and begin ticking only once it has finished. Shared by
  // Start and Resume; only Start seeds remainingRef from the configured duration.
  const startBellThenTick = () => {
    setStatus("running");
    clearTick();
    const audio = new Audio("/audio/timer-start.mp3");
    audio.addEventListener("ended", () => {
      beginTick();
    });
    audio.play().catch((err) => {
      console.log(err);
      beginTick();
    });
  };

  const handleIntervalSeconds = (value: string) => {
    setIntervalSeconds(Math.max(0, Math.floor(Number(value) || 0)));
  };

  const handleLowerBound = (value: string) => {
    setLowerBound(Math.max(0, Math.floor(Number(value) || 0)));
  };

  const handleUpperBound = (value: string) => {
    setUpperBound(Math.max(0, Math.floor(Number(value) || 0)));
  };

  const handleStart = () => {
    remainingRef.current = configuredTotal;
    setRemaining(configuredTotal);
    cueModeRef.current = cueMode;
    visualFlashRef.current = visualFlashEnabled;
    paceIntervalRef.current = intervalSeconds;
    lowerBoundRef.current = lowerBound;
    upperBoundRef.current = upperBound;
    nextCueRef.current =
      cueMode === "pace"
        ? intervalSeconds
        : cueMode === "random"
          ? randomGap(lowerBound, upperBound)
          : 0;
    startBellThenTick();
  };

  const handlePause = () => {
    clearTick();
    setStatus("paused");
    play("/audio/interval.mp3");
  };

  const handleResume = () => {
    startBellThenTick();
  };

  const handleReset = () => {
    clearTick();
    clearFlash();
    setStatus("idle");
    remainingRef.current = configuredTotal;
    setRemaining(configuredTotal);
    nextCueRef.current = 0;
    play("/audio/interval.mp3");
  };

  return (
    <>
      <div
        data-testid="flash-overlay"
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 bg-timer-react/40 ${
          flashing ? "opacity-100" : "opacity-0"
        }`}
      />
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6">
          <div className={`font-mono text-7xl tabular-nums ${digitColor[status]}`}>
            {formatTime(remaining)}
          </div>

          <div className="flex w-full gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="minutes" className="text-muted-foreground">
                Minutes
              </Label>
              <Input
                id="minutes"
                type="number"
                min={0}
                placeholder="0"
                value={minutes === 0 ? "" : minutes}
                disabled={status !== "idle"}
                onChange={(e) => handleMinutes(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="seconds" className="text-muted-foreground">
                Seconds
              </Label>
              <Input
                id="seconds"
                type="number"
                min={0}
                max={59}
                placeholder="0"
                value={seconds === 0 ? "" : seconds}
                disabled={status !== "idle"}
                onChange={(e) => handleSeconds(e.target.value)}
              />
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <span className="text-sm text-muted-foreground">Mode</span>
            <RadioGroup
              aria-label="Cue mode"
              value={cueMode}
              onValueChange={(value) => setCueMode(value as CueMode)}
              disabled={status !== "idle"}
              className="flex flex-row gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="cue-off" value="off" />
                <Label htmlFor="cue-off" className="text-muted-foreground">
                  Normal
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="cue-pace" value="pace" />
                <Label htmlFor="cue-pace" className="text-muted-foreground">
                  Pace
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="cue-random" value="random" />
                <Label htmlFor="cue-random" className="text-muted-foreground">
                  Random
                </Label>
              </div>
            </RadioGroup>
            {cueMode === "pace" ?
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pace-seconds" className="text-muted-foreground">
                  Pace (sec)
                </Label>
                <Input
                  id="pace-seconds"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={intervalSeconds === 0 ? "" : intervalSeconds}
                  disabled={cueMode !== "pace" || status !== "idle"}
                  aria-invalid={paceInvalid}
                  aria-describedby={paceError ? "pace-error" : undefined}
                  onChange={(e) => handleIntervalSeconds(e.target.value)}
                />
                {paceError ?
                  <p id="pace-error" className="text-sm text-destructive">
                    {paceError}
                  </p> :
                  null
                }
              </div> :
              <div />
            }
            {cueMode === "random" ?
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="random-min" className="text-muted-foreground">
                      Min (sec)
                    </Label>
                    <Input
                      id="random-min"
                      type="number"
                      min={1}
                      placeholder="1"
                      value={lowerBound === 0 ? "" : lowerBound}
                      disabled={cueMode !== "random" || status !== "idle"}
                      aria-invalid={randomInvalid}
                      aria-describedby={randomError ? "random-error" : undefined}
                      onChange={(e) => handleLowerBound(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="random-max" className="text-muted-foreground">
                      Max (sec)
                    </Label>
                    <Input
                      id="random-max"
                      type="number"
                      min={1}
                      placeholder="2"
                      value={upperBound === 0 ? "" : upperBound}
                      disabled={cueMode !== "random" || status !== "idle"}
                      aria-invalid={randomInvalid}
                      aria-describedby={randomError ? "random-error" : undefined}
                      onChange={(e) => handleUpperBound(e.target.value)}
                    />
                  </div>
                </div>
                {randomError ?
                  <p id="random-error" className="text-sm text-destructive">
                    {randomError}
                  </p> :
                  null
                }
              </div> :
              <div />
            }
          </div>

          { cueMode !== "off" ?
            <div className="flex w-full items-center gap-2">
              <Checkbox
                id="visual-flash"
                checked={visualFlashEnabled}
                onCheckedChange={(checked) => setVisualFlashEnabled(checked)}
                disabled={status !== "idle"}
              />
              <Label htmlFor="visual-flash" className="font-sans text-muted-foreground">
                Flash at beep
              </Label>
            </div> : 
            null
          }

          <div className="flex w-full gap-4">
            <Button
              className="flex-1"
              size="lg"
              disabled={paceInvalid || randomInvalid}
              onClick={
                status === "running"
                  ? handlePause
                  : status === "paused"
                    ? handleResume
                    : handleStart
              }
            >
              {status === "running"
                ? "Pause"
                : status === "paused"
                  ? "Resume"
                  : "Start"}
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="destructive"
              onClick={handleReset}
              disabled={isRunning}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
