"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Cue = {
  file: string;
  use: string;
};

const cues: Cue[] = [
  { file: "/audio/timer-start.mp3", use: "Round start bell" },
  { file: "/audio/timer-end.mp3", use: "Round end bell" },
  { file: "/audio/interval.mp3", use: "Interval / warning cue" },
];

type Status = "idle" | "playing" | "missing";

export function AudioPreview() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const audiosRef = useRef<Record<string, HTMLAudioElement>>({});

  const play = (file: string) => {
    let audio = audiosRef.current[file];
    if (!audio) {
      audio = new Audio(file);
      audio.addEventListener("ended", () =>
        setStatuses((s) => ({ ...s, [file]: "idle" })),
      );
      audio.addEventListener("error", () =>
        setStatuses((s) => ({ ...s, [file]: "missing" })),
      );
      audiosRef.current[file] = audio;
    }
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setStatuses((s) => ({ ...s, [file]: "playing" })))
      .catch(() => setStatuses((s) => ({ ...s, [file]: "missing" })));
  };

  return (
    <div className="flex flex-col gap-3">
      {cues.map((cue) => {
        const status = statuses[cue.file] ?? "idle";
        return (
          <div
            key={cue.file}
            className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-secondary px-4 py-3"
          >
            <div className="flex flex-col gap-1">
              <code className="font-mono text-sm text-accent">{cue.file}</code>
              <span className="text-sm text-muted-foreground">{cue.use}</span>
            </div>
            <div className="flex items-center gap-3">
              {status === "missing" && (
                <span className="text-xs text-destructive">
                  File not found in public/audio/
                </span>
              )}
              {status === "playing" && (
                <span className="text-xs text-muted-foreground">Playing…</span>
              )}
              <Button size="sm" onClick={() => play(cue.file)}>
                Play Sound
              </Button>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Convention: kebab-case .mp3 filenames named after the cue&apos;s
        purpose. Reference by public URL — do not import through the bundler.
      </p>
    </div>
  );
}
