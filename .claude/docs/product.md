# Product requirements document

This is the product requirements document written from the perspective of the product manager for this application. All coding agents must read this document before starting feature work to understand priorities, scope, and acceptance criteria.

---

## Product vision

Bieper aims to be the primary timer application for sports training especially for reaction training for martial arts. It aims to allow users to be able to train in reaction timing drills and workouts without the need of a human partner.

## Target users

- Busy adult who wants to train in recognizing and shortening reaction time for combat sports but can't make it to the gym or pay for a trainer partner to provide reaction timing cues.

## Core problem statement

Current timer applications only provide interval windows for interval workouts or steady pace beeps on beat for physical examination. There doesn't exist an application where the triggers and beeps are random which allows its users to train in reaction time.

---

## Feature requirements

Features are grouped by milestone. Each feature has a priority, a brief description, and acceptance criteria. Agents should implement features in milestone order, respecting priorities within each milestone.

### Milestone 1 — MVP

| ID | Feature | Priority | Description | Acceptance criteria |
| -- | ------- | -------- | ----------- | ------------------- |
|  1  |    Simple timer     |    P0      |    Simple timer, allow user to set time in minutes and seconds and counts down         |         Allows users to set time in minutes and seconds, shows the countdown live as the timer is running. Allows the user to start the timer. Beeps when the start button is clicked. Beeps when the timer is done counting down       |
| 2 | Interval beeping (pace) | P0 | User can enable a fixed-pace beep (`/audio/interval.mp3`) played at a regular whole-second interval while the countdown runs. | User enables the "Pace interval (sec)" control and enters an interval in whole seconds. While the countdown runs, `/audio/interval.mp3` plays after each whole interval of elapsed time. The interval must be an integer ≥ 1 and **strictly less than** the configured countdown duration in seconds (e.g. for a 2:00 timer, 1–119). No beep fires at Start, and none fires at 00:00 — only the end cue `/audio/timer-stop.mp3` plays at completion (an interval boundary landing on 00:00 is suppressed). Enable/disable only when the timer is fully stopped (idle / after reset), not while running or paused. Mutually exclusive with feature 5 (random interval cue) — enabling one disables the other. Each beep may additionally trigger the optional violet flash (feature 8). |
| 3 | Pause / resume | P0 | User can pause an in-progress countdown and resume from the same remaining time. | While the timer is running, the user can pause it; the displayed time freezes at the current remaining value. Resuming continues the countdown from that exact value. Any active interval beeping or random interval cue is also paused and resumed. |
| 4 | Reset | P0 | User can reset the timer back to its configured starting time. | A reset control is available when the timer is paused or has ended. Pressing reset stops any beeping/cues and restores the displayed time to the user-configured starting value. Reset is not destructive of the configured time, interval, random-cue, or visual-flash settings. |
| 5 | Random interval cue | P0 | While the countdown runs, the app plays `/audio/interval.mp3` at random whole-second gaps within a user-defined min/max range, so the user cannot anticipate the next cue (reaction training). | User enables the "Random interval (sec)" control and enters a lower (min) and upper (max) gap in whole seconds, with **1 ≤ lower < upper < the configured countdown duration in seconds** (lower ≥ 1; upper strictly greater than lower; upper strictly less than the total). Each cue fires after a gap chosen as a uniform random integer in [lower, upper]; after every cue a fresh random gap is chosen. The first cue fires after an initial random gap (NOT on Start). No cue fires at 00:00 — only `/audio/timer-stop.mp3` plays at completion (a cue scheduled at/after the end is suppressed). Enable/disable only when the timer is not running. Mutually exclusive with feature 2 (interval beeping) — enabling one disables the other. Audio-only: each cue may additionally trigger the optional violet flash (feature 8); the previously-envisioned independent audio/visual toggle is superseded by feature 8. |
| 8 | Visual cue flash | P1 | An opt-in full-screen violet flash that accompanies each audio cue beep from features 2 and 5, reinforcing the cue visually for reaction training. | A "Visual flash" toggle, when enabled, briefly flashes the whole screen Vivid Violet (the "React" colour in `design.md`, `#8B5CF6`) for ~200 ms each time a feature-2 or feature-5 cue plays `/audio/interval.mp3`. The audio cue always plays regardless of this toggle. The flash never fires on non-cue `/audio/interval.mp3` plays (Reset, Pause). The toggle is editable only when the timer is idle and is preserved across a reset. The overlay is non-interactive (never blocks controls). Applies to whichever cue mode (feature 2 or 5) is active; the two cue modes remain mutually exclusive. |

### Milestone 2 — Enhanced

<!-- Features that build on the MVP to improve usability and training value. -->

| ID | Feature | Priority | Description | Acceptance criteria |
| -- | ------- | -------- | ----------- | ------------------- |
| 6 | Round-based training | P0 | User can run a session as a sequence of timed rounds with rest intervals between them, mirroring combat-sports training structure. | User configures: number of rounds (≥ 1), work duration (minutes + seconds), and rest duration (minutes + seconds) between rounds. Starting the session runs round 1's work duration, then rest, then round 2, and so on until the final round's work duration finishes (no trailing rest). The current round number and current phase (work vs. rest) are visible at all times. Phase transitions are signalled audibly (start/end beeps) and visually via the design's Active/Rest state colours. Pause / resume / reset behaviour from features 3 and 4 applies to the whole session. Interval beeping or random interval cue (if enabled) runs only during work phases, not during rest. |
| 7 | Master volume & mute | P1 | User can adjust the overall loudness of all timer sounds or mute them entirely. | A single master volume slider controls the volume of all timer sounds (start, end, interval, reaction). A mute toggle silences all sounds without losing the slider value. Volume and mute state persist within a session. |

### Milestone 3 — Polish & growth

<!-- Nice-to-haves, social features, platform expansion, etc. -->

| ID | Feature | Priority | Description | Acceptance criteria |
| -- | ------- | -------- | ----------- | ------------------- |
|    |         |          |             |                     |

#### Priority definitions

- **P0 — Must have:** Blocks the milestone. Cannot ship without it.
- **P1 — Should have:** Important but the milestone can ship without it if needed.
- **P2 — Nice to have:** Adds value but can be deferred without impact.

---

## User flows

<!-- Describe the key user journeys. Add or remove flows as needed. -->

### Flow 1: _[name]_

1.
2.
3.

### Flow 2: _[name]_

1.
2.
3.

---

## Non-functional requirements

<!-- Performance, accessibility, platform support, offline behaviour, etc. -->

| Category        | Requirement |
| --------------- | ----------- |
| Performance     |             |
| Accessibility   |             |
| Browser support |             |
| Offline         |             |
| Audio           | It should be a crisp "beep" sound that is easy for users at any age group to pick up even with background noise |

---

## Constraints & assumptions

<!-- Known limitations, technical boundaries, or assumptions the PM is making. -->


---

## Out of scope

- Database and backend integration
- Different trigger sounds (audio)

## Open questions

<!-- Unresolved decisions that need PM/stakeholder input before implementation. -->

| # | Question | Owner | Status | Resolution |
| - | -------- | ----- | ------ | ---------- |
|   |          |       |        |            |

---

## Changelog

| Date | Author | Change |
| ---- | ------ | ------ |
| 2026-06-12 | PM (task reconciliation) | Reconciled features 2 & 5 with tasks BPR-004/005/006. Feature 2 (renamed "Interval beeping (pace)"): whole-second interval, must be ≥ 1 and strictly < total duration; no beep at Start or 00:00. Feature 5 (renamed "Random interval cue"): audio-only, strict bounds 1 ≤ lower < upper < total, uniform integer gaps re-randomised after each cue; no cue at Start or 00:00. Removed feature 5's independent audio/visual toggle. Added feature 8 (Visual cue flash, P1): opt-in ~200 ms violet "React" full-screen flash shared by both cue modes. |
