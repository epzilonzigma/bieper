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
type Phase = "work" | "rest";

const digitColor: Record<Status, string> = {
  idle: "text-timer-idle",
  running: "text-timer-active",
  paused: "text-timer-paused",
};

// Rounds-mode digit colours, keyed by the current session phase.
const phaseColor: Record<Phase, string> = {
  work: "text-timer-active",
  rest: "text-timer-rest",
};

const phaseLabel: Record<Phase, string> = {
  work: "Work",
  rest: "Rest",
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
  const [roundsEnabled, setRoundsEnabled] = useState(false);
  const [roundCount, setRoundCount] = useState(1);
  const [restMinutes, setRestMinutes] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("work");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);
  // Tracks the start/resume bell so a mid-bell interrupt can cancel the pending
  // beginTick and stop the bell. startKindRef records whether the pending bell
  // is an initial Start or a Resume (null once the tick has begun); startGenRef
  // is bumped on interrupt so the pending begin() becomes a no-op.
  const startBellRef = useRef<HTMLAudioElement | null>(null);
  const startKindRef = useRef<"start" | "resume" | null>(null);
  const startGenRef = useRef(0);
  // Cue settings the running tick reads. Seeded at Start only (controls are
  // locked while non-idle, so they cannot drift), which keeps the beep schedule
  // correct across pause/resume since `beginTick` re-runs but never re-seeds.
  const cueModeRef = useRef<CueMode>("off");
  const paceIntervalRef = useRef(0);
  const lowerBoundRef = useRef(0);
  const upperBoundRef = useRef(0);
  // Tenths of a second until the next cue fires. Shared by both cue modes: Pace
  // reseeds it with the fixed interval, Random reseeds it with a fresh random gap.
  const nextCueRef = useRef(0);
  // Visual-flash toggle captured at Start so the running tick reads a value that
  // cannot change mid-run, plus the id of the pending flash-clear timeout.
  const visualFlashRef = useRef(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Round settings captured at Start (controls are locked while non-idle, so
  // they cannot drift). phaseRef/currentRoundRef are the authoritative values
  // the tick reads and mutates synchronously; the matching state mirrors them
  // for rendering only (reading state inside the tick would be stale).
  const roundsEnabledRef = useRef(false);
  const roundCountRef = useRef(1);
  const workTenthsRef = useRef(0);
  const restTenthsRef = useRef(0);
  const phaseRef = useRef<Phase>("work");
  const currentRoundRef = useRef(1);

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
  // In Rounds mode the work duration (configuredTotal) and rest must each be at
  // least 1s, and the count an integer ≥ 1; rest only matters when there is a
  // rest phase (roundCount ≥ 2). Gates Start; no inline error is shown.
  const restTotal = restMinutes * 60 + restSeconds;
  const roundsInvalid =
    roundsEnabled &&
    (roundCount < 1 ||
      configuredTotal < 1 ||
      (roundCount >= 2 && restTotal < 1));

  // Rounds mode colours the digits by phase while running; every idle state —
  // the pre-Start preview, after Reset, and after completion — uses the idle
  // grey via digitColor, so idle never borrows the Amber rest/ready hue.
  const digitClass =
    roundsEnabled && status === "running"
      ? phaseColor[phase]
      : digitColor[status];
  // The phase/round indicator shows while a session runs, and previews the round
  // count before Start; it disappears on completion (idle with remaining 0).
  const showRoundInfo =
    roundsEnabled &&
    (status !== "idle" || (remaining > 0 && roundCount >= 1));

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
  // is not requesting reduced motion. Overlapping cues restart the 100 ms window.
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
      flashTimeoutRef.current = setTimeout(() => setFlashing(false), 100);
    }
  };

  // Seed the tenths-until-next-cue from the captured cue settings. Used at Start
  // (single-timer path) and on each Work-phase entry (Rounds mode); Rest leaves
  // it at 0 since the cue branch is gated to Work phases.
  const seedNextCue = () => {
    nextCueRef.current =
      cueModeRef.current === "pace"
        ? paceIntervalRef.current
        : cueModeRef.current === "random"
          ? Math.round(randomGap(lowerBoundRef.current, upperBoundRef.current) * 10)
          : 0;
  };

  // Single transition point for the round state machine, called from the tick's
  // completion branch so digit colour and audio follow the phase automatically.
  // It never calls clearTick (except on final completion), so the one interval
  // survives every transition — no second interval is ever created.
  const advancePhase = () => {
    if (phaseRef.current === "work") {
      play("/audio/timer-stop.mp3");
      if (currentRoundRef.current < roundCountRef.current) {
        phaseRef.current = "rest";
        setPhase("rest");
        // Advance now so Rest shows the upcoming round.
        currentRoundRef.current += 1;
        setCurrentRound(currentRoundRef.current);
        remainingRef.current = restTenthsRef.current;
        setRemaining(Math.ceil(restTenthsRef.current / 10));
        nextCueRef.current = 0;
      } else {
        // Final Work done: end the session, leaving remaining at 0 (00:00).
        clearTick();
        clearFlash();
        setStatus("idle");
      }
    } else {
      // rest → work: start the next round, reseed the cue schedule, and ring
      // the round-start bell (non-blocking, so Rest → Work timing stays exact).
      phaseRef.current = "work";
      setPhase("work");
      remainingRef.current = workTenthsRef.current;
      setRemaining(Math.ceil(workTenthsRef.current / 10));
      seedNextCue();
      play("/audio/round-start.mp3");
    }
  };

  const beginTick = () => {
    clearTick();
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      // remainingRef counts tenths of a second; ceil keeps the mm:ss display on
      // 00:01 until the final 100ms elapses, flipping to 00:00 exactly at the end.
      setRemaining(Math.ceil(remainingRef.current / 10));
      if (remainingRef.current <= 0) {
        if (roundsEnabledRef.current) {
          // Swap to the next phase in place; setRemaining above (0) is overwritten
          // in the same tick, so no phase ever visibly renders 00:00 mid-session.
          advancePhase();
        } else {
          clearTick();
          clearFlash();
          play("/audio/timer-stop.mp3");
          setStatus("idle");
        }
      } else if (
        cueModeRef.current !== "off" &&
        (!roundsEnabledRef.current || phaseRef.current === "work")
      ) {
        // Single countdown shared by both cue modes; only the reseed differs.
        // Sits after the completion guard, so no cue ever fires at 00:00.
        nextCueRef.current -= 1;
        if (nextCueRef.current === 0) {
          fireCue();
          nextCueRef.current =
            cueModeRef.current === "pace"
              ? paceIntervalRef.current
              : Math.round(randomGap(lowerBoundRef.current, upperBoundRef.current) * 10);
        }
      }
    }, 100);
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
  const startBellThenTick = (kind: "start" | "resume") => {
    setStatus("running");
    clearTick();
    startGenRef.current += 1;
    const gen = startGenRef.current;
    startKindRef.current = kind;
    const audio = new Audio("/audio/timer-start.mp3");
    startBellRef.current = audio;
    // Begin ticking only if this bell was not interrupted; a mid-bell pause or
    // reset bumps startGenRef, so a stale begin() from either path is dropped.
    const begin = () => {
      if (gen !== startGenRef.current) return;
      startKindRef.current = null;
      startBellRef.current = null;
      beginTick();
    };
    audio.addEventListener("ended", begin);
    audio.play().catch((err) => {
      console.log(err);
      begin();
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

  const handleRoundCount = (value: string) => {
    setRoundCount(Math.max(0, Math.floor(Number(value) || 0)));
  };

  const handleRestMinutes = (value: string) => {
    setRestMinutes(Math.max(0, Math.floor(Number(value) || 0)));
  };

  const handleRestSeconds = (value: string) => {
    setRestSeconds(Math.min(59, Math.max(0, Math.floor(Number(value) || 0))));
  };

  const handleStart = () => {
    cueModeRef.current = cueMode;
    visualFlashRef.current = visualFlashEnabled;
    paceIntervalRef.current = intervalSeconds * 10;
    lowerBoundRef.current = lowerBound;
    upperBoundRef.current = upperBound;
    roundsEnabledRef.current = roundsEnabled;
    if (roundsEnabled) {
      // Start directly into Work(1); work/rest lengths and the round count are
      // captured here since the controls lock while the session runs. Round 1's
      // start is signalled only by the start bell that startBellThenTick plays —
      // the round-start bell rings on later Rest → Work entries, not here.
      roundCountRef.current = roundCount;
      workTenthsRef.current = configuredTotal * 10;
      restTenthsRef.current = restTotal * 10;
      phaseRef.current = "work";
      setPhase("work");
      currentRoundRef.current = 1;
      setCurrentRound(1);
      remainingRef.current = configuredTotal * 10;
      setRemaining(configuredTotal);
      seedNextCue();
    } else {
      remainingRef.current = configuredTotal * 10;
      setRemaining(configuredTotal);
      seedNextCue();
    }
    startBellThenTick("start");
  };

  // Invalidate any pending begin() and stop the bell if one is mid-play. A safe
  // no-op when no bell is pending (normal running pause / reset while paused).
  const cancelPendingStart = () => {
    startGenRef.current += 1;
    if (startBellRef.current !== null) {
      startBellRef.current.pause();
      startBellRef.current = null;
    }
    startKindRef.current = null;
  };

  // Restore the idle/scratch state (shared by Reset and the start-bell abort);
  // callers play the /audio/interval.mp3 cue themselves.
  const resetToIdle = () => {
    clearTick();
    clearFlash();
    setStatus("idle");
    remainingRef.current = configuredTotal * 10;
    setRemaining(configuredTotal);
    phaseRef.current = "work";
    setPhase("work");
    currentRoundRef.current = 1;
    setCurrentRound(1);
    nextCueRef.current = 0;
  };

  const handleReset = () => {
    cancelPendingStart();
    resetToIdle();
    play("/audio/interval.mp3");
  };

  const handlePause = () => {
    // Interrupting the initial start bell aborts the run entirely — same reset
    // to scratch as the Reset button. Interrupting a resume bell, or pausing a
    // running countdown, freezes at the current remaining value.
    if (startKindRef.current === "start") {
      handleReset();
      return;
    }
    cancelPendingStart();
    clearTick();
    setStatus("paused");
    play("/audio/interval.mp3");
  };

  const handleResume = () => {
    startBellThenTick("resume");
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
          <div className={`font-mono text-7xl tabular-nums ${digitClass}`}>
            {formatTime(remaining)}
          </div>

          {showRoundInfo ?
            <div className="flex flex-col items-center gap-1 font-sans text-muted-foreground">
              {status !== "idle" ? <span>{phaseLabel[phase]}</span> : null}
              <span>Round {currentRound} / {roundCount}</span>
            </div> :
            null
          }

          <div className="flex w-full items-center gap-2">
            <Checkbox
              id="rounds"
              checked={roundsEnabled}
              onCheckedChange={(checked) => setRoundsEnabled(checked)}
              disabled={status !== "idle"}
            />
            <Label htmlFor="rounds" className="font-sans text-muted-foreground">
              Rounds
            </Label>
          </div>

          {roundsEnabled ?
            <div className="flex w-full flex-col gap-1.5 border-b border-border pb-4">
              <Label htmlFor="round-count" className="text-foreground text-lg font-bold">
                Rounds
              </Label>
              <Input
                id="round-count"
                type="number"
                min={1}
                placeholder="1"
                value={roundCount === 0 ? "" : roundCount}
                disabled={status !== "idle"}
                onChange={(e) => handleRoundCount(e.target.value)}
              />
            </div> :
            null
          }

          <div className={`flex w-full flex-col gap-1.5${roundsEnabled ? " border-b border-border pb-4" : ""}`}>
            {roundsEnabled ?
              <Label className="text-lg font-bold text-foreground">Work round</Label> :
              null
            }
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
          </div>

          {roundsEnabled ?
            <div className="flex w-full flex-col gap-1.5 border-b border-border pb-4">
              <Label className="text-lg font-bold text-foreground">Rest round</Label>
              <div className="flex w-full gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-muted-foreground">Minutes</Label>
                  <Input
                    id="rest-minutes"
                    aria-label="Minutes"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={restMinutes === 0 ? "" : restMinutes}
                    disabled={status !== "idle"}
                    onChange={(e) => handleRestMinutes(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-muted-foreground">Seconds</Label>
                  <Input
                    id="rest-seconds"
                    aria-label="Seconds"
                    type="number"
                    min={0}
                    max={59}
                    placeholder="0"
                    value={restSeconds === 0 ? "" : restSeconds}
                    disabled={status !== "idle"}
                    onChange={(e) => handleRestSeconds(e.target.value)}
                  />
                </div>
              </div>
            </div> :
            null
          }

          <div className="flex w-full flex-col gap-3">
            <span className="text-sm text-muted-foreground">Mode</span>
            <RadioGroup
              aria-label="Cue mode"
              value={cueMode}
              onValueChange={(value) => {
                const mode = value as CueMode;
                setCueMode(mode);
                // Normal mode has no cue to flash, so the toggle is hidden and
                // its state must not linger true from a previous cue mode.
                if (mode === "off") {
                  setVisualFlashEnabled(false);
                }
              }}
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
              disabled={paceInvalid || randomInvalid || roundsInvalid}
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
