"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isValidInterval } from "@/lib/timer-cues";

type Status = "idle" | "running" | "paused";
type CueMode = "off" | "pace";

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

// Dedicated call site for the Pace interval beep, kept separate from the generic
// play() used by Start/Reset/Pause so BPR-006 can hook the visual flash onto cue
// beeps only. For now it only plays the sound.
const fireCue = () => {
  const audio = new Audio("/audio/interval.mp3");
  audio.play().catch((err) => {console.log(err)});
};

export const Timer = () => {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [cueMode, setCueMode] = useState<CueMode>("off");
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);
  // Cue settings the running tick reads. Seeded at Start only (controls are
  // locked while non-idle, so they cannot drift), which keeps the beep schedule
  // correct across pause/resume since `beginTick` re-runs but never re-seeds.
  const cueModeRef = useRef<CueMode>("off");
  const intervalSecondsRef = useRef(0);
  const totalRef = useRef(0);

  const configuredTotal = minutes * 60 + seconds; // what value to count down from?
  const isRunning = status === "running";
  const paceInvalid =
    cueMode === "pace" && !isValidInterval(intervalSeconds, configuredTotal);
  const paceError = !paceInvalid
    ? null
    : configuredTotal < 2
      ? "Set a timer of at least 2 seconds to use Pace."
      : `Enter a whole number from 1 to ${configuredTotal - 1}.`;

  const clearTick = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const beginTick = () => {
    clearTick();
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearTick();
        play("/audio/timer-stop.mp3");
        setStatus("idle");
      } else if (
        cueModeRef.current === "pace" &&
        isValidInterval(intervalSecondsRef.current, totalRef.current) &&
        (totalRef.current - remainingRef.current) % intervalSecondsRef.current === 0
      ) {
        fireCue();
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearTick();
    };
  }, []);

  const handleMinutes = (value: string) => {
    const parsed = Math.max(0, Math.floor(Number(value) || 0));
    setMinutes(parsed);
    setRemaining(parsed * 60 + seconds);
    setStatus("idle");
  };

  const handleSeconds = (value: string) => {
    const parsed = Math.min(59, Math.max(0, Math.floor(Number(value) || 0)));
    setSeconds(parsed);
    setRemaining(minutes * 60 + parsed);
    setStatus("idle");
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

  const handleStart = () => {
    remainingRef.current = configuredTotal;
    setRemaining(configuredTotal);
    cueModeRef.current = cueMode;
    intervalSecondsRef.current = intervalSeconds;
    totalRef.current = configuredTotal;
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
    setStatus("idle");
    remainingRef.current = configuredTotal;
    setRemaining(configuredTotal);
    play("/audio/interval.mp3");
  };

  return (
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
        </div>

        <div className="flex w-full gap-4">
          <Button
            className="flex-1"
            size="lg"
            disabled={paceInvalid}
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
  );
};
