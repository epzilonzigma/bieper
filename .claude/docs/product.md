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
| 2 | Interval beeping (pace) | P0 | User can enable a fixed-pace beep (`/audio/interval.mp3`) played at a regular whole-second interval while the countdown runs. | User selects **Pace** in the "Cue mode" selector (Off / Pace / Random) and enters an interval in whole seconds. While the countdown runs, `/audio/interval.mp3` plays after each whole interval of elapsed time. The interval must be an integer ≥ 1 and **strictly less than** the configured countdown duration in seconds (e.g. for a 2:00 timer, 1–119). No beep fires at Start, and none fires at 00:00 — only the end cue `/audio/timer-stop.mp3` plays at completion (an interval boundary landing on 00:00 is suppressed). The cue mode can be changed only when the timer is fully stopped (idle / after reset), not while running or paused. Mutually exclusive with feature 5 (random interval cue) — the single Cue-mode selector makes the modes exclusive (selecting one deselects the other). Each beep may additionally trigger the optional violet flash (feature 6). Cue-gap granularity is upgraded to 100ms in Milestone 2 by feature 9. |
| 3 | Pause / resume | P0 | User can pause an in-progress countdown and resume from the same remaining time. | While the timer is running, the user can pause it; the displayed time freezes at the current remaining value. Resuming continues the countdown from that exact value. Any active interval beeping or random interval cue is also paused and resumed. |
| 4 | Reset | P0 | User can reset the timer back to its configured starting time. | A reset control is available when the timer is paused or has ended. Pressing reset stops any beeping/cues and restores the displayed time to the user-configured starting value. Reset is not destructive of the configured time, interval, random-cue, or visual-flash settings. |
| 5 | Random interval cue | P0 | While the countdown runs, the app plays `/audio/interval.mp3` at random whole-second gaps within a user-defined min/max range, so the user cannot anticipate the next cue (reaction training). | User selects **Random** in the "Cue mode" selector (Off / Pace / Random) and enters a lower (min) and upper (max) gap in whole seconds, with **1 ≤ lower < upper < the configured countdown duration in seconds** (lower ≥ 1; upper strictly greater than lower; upper strictly less than the total). Each cue fires after a gap chosen as a uniform random integer in [lower, upper]; after every cue a fresh random gap is chosen. The first cue fires after an initial random gap (NOT on Start). No cue fires at 00:00 — only `/audio/timer-stop.mp3` plays at completion (a cue scheduled at/after the end is suppressed). The cue mode can be changed only when the timer is not running. Mutually exclusive with feature 2 (interval beeping) — the single Cue-mode selector makes the modes exclusive (selecting one deselects the other). Audio-only: each cue may additionally trigger the optional violet flash (feature 6); the previously-envisioned independent audio/visual toggle is superseded by feature 6. Cue-gap granularity is upgraded to 100ms in Milestone 2 by feature 9. |
| 6 | Visual cue flash | P1 | An opt-in full-screen violet flash that accompanies each audio cue beep from features 2 and 5, reinforcing the cue visually for reaction training. | A "Visual flash" toggle, when enabled, briefly flashes the whole screen Vivid Violet (the "React" colour in `design.md`, `#8B5CF6`) for ~200 ms each time a feature-2 or feature-5 cue plays `/audio/interval.mp3`. The audio cue always plays regardless of this toggle. The flash never fires on non-cue `/audio/interval.mp3` plays (Reset, Pause). The toggle is editable only when the timer is idle and is preserved across a reset. The overlay is non-interactive (never blocks controls). Applies to whichever cue mode (feature 2 or 5) is active; the two cue modes remain mutually exclusive. |

### Milestone 2 — Enhanced

<!-- Features that build on the MVP to improve usability and training value. -->

| ID | Feature | Priority | Description | Acceptance criteria |
| -- | ------- | -------- | ----------- | ------------------- |
| 7 | Round-based training | P0 | User can run a session as a sequence of timed work rounds with rest/timeout intervals between them, mirroring combat-sports training structure, with one cue (beep) mode applied across all rounds. | User configures: number of rounds (≥ 1), work duration (minutes + seconds), and rest/timeout duration (minutes + seconds) between rounds. The user selects a **single cue mode** (Normal / Pace / Random — all three modes from features 2 and 5 are supported) that applies to **every** work round; the chosen mode is not selected per-round. Starting the session runs round 1's work duration, then rest, then round 2, and so on until the final round's work duration finishes (**no trailing rest** after the last round). The current round number and current phase (work vs. rest) are visible at all times. The **Rounds** toggle sits **above** the work Minutes/Seconds inputs; when it is on, the Minutes/Seconds are labelled as the **work-round** duration and the **rest** duration inputs appear immediately below them. The start of every **mid-session** work round (rounds 2..N) plays `round-start.mp3`; the **first work round is not** accompanied by `round-start.mp3` — the very start of the session plays `timer-start.mp3` once instead. Leaving a work round (into rest or completion) plays `timer-stop.mp3`. Phases are signalled visually via the design's Active / Rest state colours (see `design.md`: Active `#10B981`, Rest `#F59E0B`). Pause / resume / reset behaviour from features 3 and 4 applies to the whole session. The selected interval beeping or random interval cue runs only during work phases, never during rest. |
| 8 | Master volume & mute | P1 | User can adjust the overall loudness of all timer sounds or mute them entirely. | A single master volume slider controls the volume of all timer sounds (start, end, interval, reaction). A mute toggle silences all sounds without losing the slider value. Volume and mute state persist within a session. |
| 9 | Sub-second (100ms) cue granularity | P0 | All cue modes (Pace and Random) schedule cue gaps at 100ms (0.1s) resolution instead of whole seconds, so reaction cues feel more spontaneous and less anticipatable. | The Pace interval and the Random Min/Max inputs accept **0.1-second steps** (decimal seconds, e.g. `0.5`, `1.3`), with the smallest allowed gap **0.1s**. The existing strict-ordering rules carry over at the finer resolution: Pace requires `0.1 ≤ interval < total`; Random requires `0.1 ≤ Min < Max < total` (total = configured countdown duration in seconds; in round mode, the work duration). The first cue still does not fire on Start, and no cue fires at 00:00 (a cue scheduled at/after the end is suppressed — only `timer-stop.mp3` plays). The countdown/cue engine resolves timing at ≤ 100ms. This **supersedes the whole-second-only constraints** in features 2 and 5. |
| 10 | Mobile browser rendering | P0 | The entire app renders and is fully usable in a smartphone browser, feeling like a native mobile application rather than a shrunk desktop page. | On a typical phone viewport (≈ 360–430 px wide, portrait), every screen — timer display, configuration inputs, cue-mode selector, round setup, and transport controls — fits and is fully operable without horizontal scrolling or pinch-zooming. The timer digits and primary controls remain legible and comfortably tappable (touch targets ≥ 44×44 px). The layout is responsive across phone, tablet, and desktop widths. The viewport is configured for mobile (`<meta name="viewport">` via the App Router) so the page renders at device width. No feature is desktop-only — all features 1–9 are reachable on mobile. |

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

## Non-functional requirements

<!-- Performance, accessibility, platform support, offline behaviour, etc. -->

| Category        | Requirement |
| --------------- | ----------- |
| Performance     | The countdown and cue-scheduling engine must keep accurate timing at 100ms resolution without audible drift across a full multi-round session. |
| Accessibility   |             |
| Browser support |             |
| Offline         |             |
| Audio           | It should be a crisp "beep" sound that is easy for users at any age group to pick up even with background noise |

---

## Constraints & assumptions

<!-- Known limitations, technical boundaries, or assumptions the PM is making. -->

---

## Changelog

| Date | Author | Change |
| ---- | ------ | ------ |
| 2026-06-12 | PM (task reconciliation) | Reconciled features 2 & 5 with tasks BPR-004/005/006. Feature 2 (renamed "Interval beeping (pace)"): whole-second interval, must be ≥ 1 and strictly < total duration; no beep at Start or 00:00. Feature 5 (renamed "Random interval cue"): audio-only, strict bounds 1 ≤ lower < upper < total, uniform integer gaps re-randomised after each cue; no cue at Start or 00:00. Removed feature 5's independent audio/visual toggle. Added feature 8 (Visual cue flash, P1): opt-in ~200 ms violet "React" full-screen flash shared by both cue modes. |
| 2026-06-12 | PM (task reconciliation) | Features 2 & 5 now share a single **"Cue mode" selector** (Off / Pace / Random) instead of two independent checkboxes — selecting one mode inherently deselects the other (BPR-004 builds Off/Pace + installs the RadioGroup; BPR-005 adds Random; BPR-006 installs the Checkbox for the Visual-flash toggle). |
| 2026-07-06 | PM | Suppressed `round-start.mp3` for the first work round (session start) across all cue modes — round 1 is now signalled by the `timer-start.mp3` Start bell alone; `round-start.mp3` plays only on mid-session Rest → Work transitions (rounds 2..N). |
| 2026-07-06 | PM | Reworked feature 7 (Round-based training): removed the 3-second "Ready" get-ready countdown — a session now runs `Work → Rest → … → Work` with no pre-round countdown and no trailing rest. Each work-round start plays `round-start.mp3` (session start still plays `timer-start.mp3` once; leaving work plays `timer-stop.mp3`). Repositioned the Rounds toggle above the work Minutes/Seconds, labelled those inputs as the work duration, and placed the rest inputs immediately below them. Recoloured the Rest phase from Cyan `#06B6D4` to Amber `#F59E0B`. |
| 2026-06-30 | PM | MVP (Milestone 1) implemented and deployed. Re-numbered features so all shipped items sit under Milestone 1 in natural order: old feature 8 (Visual cue flash) → 6; old feature 6 (Round-based training) → 7; old feature 7 (Master volume & mute) → 8 (relative order of features 1–5 unchanged; cross-references to the old IDs updated in-place). Updated the PRD for the next release: revised feature 7 (Round-based training) to the full multi-round spec (one cue mode applied across all work rounds, rest/timeout between rounds, no trailing rest); added feature 9 (Sub-second 100ms cue granularity, P0) upgrading all cue modes from whole-second to 0.1s resolution; added feature 10 (Mobile browser rendering, P0) — full responsive smartphone-browser support so the app behaves like a mobile application. Feature 8 (Master volume & mute) remains in scope, not yet built. (Historical changelog rows above keep their original feature IDs.) |
