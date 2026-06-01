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
| 2 | Interval beeping | P0 | Users can enable a beeping sound to be played at an interval in seconds set by the user while the countdown is running. | User can enter interval in seconds. beeping sounds plays at entered inverval while timer is running. Interval time cannot be 0. User can only enable or disable this feature when the timer is fully stopped (idle or after reset) — not while it is running or paused. Mutually exclusive with feature 5 (random reaction cue) — enabling one disables the other. |
| 3 | Pause / resume | P0 | User can pause an in-progress countdown and resume from the same remaining time. | While the timer is running, the user can pause it; the displayed time freezes at the current remaining value. Resuming continues the countdown from that exact value. Any active interval beeping or reaction cue is also paused and resumed. |
| 4 | Reset | P0 | User can reset the timer back to its configured starting time. | A reset control is available when the timer is paused or has ended. Pressing reset stops any beeping/cues and restores the displayed time to the user-configured starting value. Reset is not destructive of the configured time, interval, or reaction-cue settings. |
| 5 | Random reaction cue | P0 | While the countdown runs, the app fires reaction cues (audio beep and/or visual flash) at random gaps within a user-defined min/max range, training reaction recognition. | User enters a min gap and max gap in seconds (min ≥ 1, max ≥ min, max ≤ the configured countdown duration in seconds). User can independently toggle audio cue and visual cue (at least one must be enabled). While the timer is running and this mode is active, cues fire at the end of a random gap uniformly chosen within [min, max] seconds. The first cue fires after an initial random gap from the moment the timer starts (it does NOT fire immediately on start). After each cue, a new random gap is chosen and the next cue fires at the end of that gap. Because the gap fires on its terminal, the minimum gap must be ≥ 1 second (no zero-length gaps). Visual cue uses the "React" violet flash defined in `design.md`. Mode is mutually exclusive with feature 2 (interval beeping). User can enable/disable only when the timer is not running. |

### Milestone 2 — Enhanced

<!-- Features that build on the MVP to improve usability and training value. -->

| ID | Feature | Priority | Description | Acceptance criteria |
| -- | ------- | -------- | ----------- | ------------------- |
| 6 | Round-based training | P0 | User can run a session as a sequence of timed rounds with rest intervals between them, mirroring combat-sports training structure. | User configures: number of rounds (≥ 1), work duration (minutes + seconds), and rest duration (minutes + seconds) between rounds. Starting the session runs round 1's work duration, then rest, then round 2, and so on until the final round's work duration finishes (no trailing rest). The current round number and current phase (work vs. rest) are visible at all times. Phase transitions are signalled audibly (start/end beeps) and visually via the design's Active/Rest state colours. Pause / resume / reset behaviour from features 3 and 4 applies to the whole session. Interval beeping or random reaction cue (if enabled) runs only during work phases, not during rest. |
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
|      |        |        |
