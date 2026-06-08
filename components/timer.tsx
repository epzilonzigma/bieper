"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "running" | "stopped";

const digitColor: Record<Status, string> = {
  idle: "text-timer-idle",
  running: "text-timer-active",
  stopped: "text-timer-stopped",
};

const formatTime = (total: number) => {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const play = (src: string) => {
  const audio = new Audio(src);
  audio.play().catch(() => {});
};

export const Timer = () => {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(0);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);

  const configuredTotal = minutes * 60 + seconds;
  const isRunning = status === "running";

  const clearTick = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearDoneTimeout = () => {
    if (doneTimeoutRef.current !== null) {
      clearTimeout(doneTimeoutRef.current);
      doneTimeoutRef.current = null;
    }
  };

  const stopStartAudio = () => {
    if (startAudioRef.current !== null) {
      startAudioRef.current.pause();
      startAudioRef.current = null;
    }
  };

  const beginTick = () => {
    clearTick();
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearTick();
        setStatus("stopped");
        play("/audio/timer-stop.mp3");
        doneTimeoutRef.current = setTimeout(() => {
          setStatus("idle");
          doneTimeoutRef.current = null;
        }, 1000);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearTick();
      clearDoneTimeout();
      stopStartAudio();
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

  const handleStart = () => {
    remainingRef.current = configuredTotal;
    setRemaining(configuredTotal);
    setStatus("running");
    clearTick();
    clearDoneTimeout();
    // Start the countdown only once the start bell has finished playing.
    const audio = new Audio("/audio/timer-start.mp3");
    startAudioRef.current = audio;
    audio.addEventListener("ended", () => {
      startAudioRef.current = null;
      beginTick();
    });
    audio.play().catch(() => {
      startAudioRef.current = null;
      beginTick();
    });
  };

  const handleReset = () => {
    clearTick();
    clearDoneTimeout();
    stopStartAudio();
    setStatus("idle");
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
              disabled={isRunning}
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
              disabled={isRunning}
              onChange={(e) => handleSeconds(e.target.value)}
            />
          </div>
        </div>

        <div className="flex w-full gap-4">
          <Button
            className="flex-1"
            size="lg"
            onClick={handleStart}
            disabled={configuredTotal === 0 || isRunning}
          >
            Start
          </Button>
          <Button
            className="flex-1"
            size="lg"
            variant="destructive"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
