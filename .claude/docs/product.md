# Product requirements document

This is the product requirements document written from the perspective of the product manager for this application. All coding agents must read this document before starting feature work to understand priorities, scope, and acceptance criteria.

---

## Product vision

<!-- One or two sentences describing the long-term aspiration for Bieper. -->

## Target users

<!-- Who is this for? List primary and secondary user personas. -->

| Persona | Description | Key needs |
| ------- | ----------- | --------- |
|         |             |           |

## Core problem statement

<!-- What problem does Bieper solve? Why do existing solutions fall short? -->

---

## Feature requirements

Features are grouped by milestone. Each feature has a priority, a brief description, and acceptance criteria. Agents should implement features in milestone order, respecting priorities within each milestone.

### Milestone 1 — MVP

<!-- The minimum set of features needed for a usable first release. -->

| ID | Feature | Priority | Description | Acceptance criteria |
| -- | ------- | -------- | ----------- | ------------------- |
|    |         |          |             |                     |

### Milestone 2 — Enhanced

<!-- Features that build on the MVP to improve usability and training value. -->

| ID | Feature | Priority | Description | Acceptance criteria |
| -- | ------- | -------- | ----------- | ------------------- |
|    |         |          |             |                     |

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
| Audio           |             |

---

## Constraints & assumptions

<!-- Known limitations, technical boundaries, or assumptions the PM is making. -->

-

---

## Out of scope

<!-- Explicitly list things this product will NOT do (at least for now). -->

-

---

## Release plan

Releases follow the milestone structure above. Each release has entry criteria (what must be done) and exit criteria (how we know it's ready to ship).

### Release 1 — MVP

- **Target:** _[date or sprint]_
- **Entry criteria:** All Milestone 1 P0 features implemented and passing acceptance criteria.
- **Exit criteria:**
  - [ ] All P0 acceptance criteria met
  - [ ] No critical or high-severity bugs open
  - [ ] Tested on target browsers/devices listed in non-functional requirements
  - [ ] Audio cues functional and not blocked by browser autoplay policies

### Release 2 — Enhanced

- **Target:** _[date or sprint]_
- **Entry criteria:** All Milestone 2 P0 features implemented.
- **Exit criteria:**
  - [ ] All P0 and P1 acceptance criteria met
  - [ ] Performance targets met

### Release 3 — Polish & growth

- **Target:** _[date or sprint]_
- **Entry criteria:** All Milestone 3 P0 features implemented.
- **Exit criteria:**
  - [ ] All acceptance criteria met
  - [ ] User feedback incorporated from earlier releases

---

## Open questions

<!-- Unresolved decisions that need PM/stakeholder input before implementation. -->

| # | Question | Owner | Status | Resolution |
| - | -------- | ----- | ------ | ---------- |
|   |          |       |        |            |

---

## Changelog

<!-- Track significant changes to this document so agents and developers know when requirements shifted. -->

| Date | Author | Change |
| ---- | ------ | ------ |
|      |        |        |
