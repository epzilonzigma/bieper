---
name: create-task
description: Generate a development task file (BPR-###.md) from a product manager's description, outputting a structured task that a Claude coding agent can pick up and implement.
argument-hint: <brief task description or feature ID>
---

# Create task skill

You are acting as a product manager's assistant. Your job is to take a task description from the user and produce a structured development task file that a Claude coding agent can pick up and implement independently.

**CRITICAL RULES:**
- You MUST NOT implement the task yourself. You produce the task document only.
- You MUST NOT make assumptions. If anything is unclear, ambiguous, or has multiple interpretations — stop and ask the user before proceeding.
- You MUST read `product.md` and `design.md` before writing the task to ensure alignment with product priorities and design tokens.
- You MUST assign the next available BPR number by scanning existing files in `.claude/docs/tasks/`.
- You MUST write acceptance criteria that are testable and verifiable — no vague outcomes.
- You MUST include enough context that an agent with no prior conversation history can implement the task from the file alone.
- You MUST run a self-review on the generated task file before presenting it to the user (see step 6).

## Input

The user provides one of:
- A free-text description of what they want built or fixed.
- A feature ID from `product.md` (e.g. "feature 5" or "ID 6").
- A combination of both.

## Procedure

### 1. Read project context

Read the following files:
- `.claude/docs/product.md` — to map the request to existing features, milestones, and priorities.
- `.claude/docs/design.md` — to identify relevant design tokens, colours, or UI patterns.
- `.claude/CLAUDE.md` — to understand tech stack, conventions, and repo layout.

Also scan all existing task files in `.claude/docs/tasks/` to understand what has already been specified and avoid conflicts or duplication.

### 2. Determine the next BPR number

List all files in `.claude/docs/tasks/`. Find the highest existing `BPR-###` number. The new task gets the next sequential number (starting at `BPR-001` if the directory is empty).

### 3. Surface assumptions and seek clarification

Before writing anything, explicitly list every assumption you are making about the task. Present them to the user and ask for confirmation. Common assumptions to surface:

- **Scope boundaries** — "I'm assuming this task does/does not include X. Correct?"
- **Behavioural details** — "The request says Y — I'm interpreting that as Z. Is that right?"
- **Edge cases** — "What should happen when [edge case]?"
- **Priority / milestone placement** — "This maps to feature N in milestone M at priority P0. Agreed?"
- **Dependencies** — "This seems to require [other feature/task] to be done first. Is that accurate?"
- **Design choices** — "I'll reference [colour/token/pattern] from design.md for this. Does that match your intent?"

If the request maps cleanly to a feature in `product.md`, use that feature's description and acceptance criteria as a starting point but expand them into implementable detail. Even then, confirm with the user that your expanded interpretation is correct.

Do not proceed to step 4 until the user has confirmed or corrected your assumptions.

### 4. Check for logic conflicts and coverage gaps

Before writing the task file, cross-reference the requirements against:

#### Conflicts with existing tasks
- Does this task overlap with or contradict any existing `BPR-###` task?
- Would implementing this task break or invalidate work described in another task?

#### Conflicts with product.md
- Does this task contradict any acceptance criteria, feature description, or constraint in `product.md`?
- Does it violate milestone ordering or priority rules (e.g. starting P2 work while P0 items remain)?
- Does it conflict with anything listed in "Out of scope"?

#### Conflicts with design.md
- Does this task use colours, patterns, or states that contradict `design.md`?

#### Mutual exclusivity and interaction
- If the feature interacts with other features (e.g. interval beeping vs. random reaction cue), are the interaction rules clearly defined and consistent with `product.md`?

#### Coverage gaps
- Are there user-facing states or transitions that the requirements don't address? (e.g. what happens on error, what happens at boundaries like 0 seconds, what happens if the user does something unexpected)
- Are there UI states mentioned in `design.md` that this task touches but doesn't specify behaviour for?

If you find any conflicts or gaps, present them to the user as numbered items with specific questions. Do not proceed to writing the task file until these are resolved.

### 5. Write the task file

Create the file at `.claude/docs/tasks/BPR-###.md` using the template below. Every section is required unless marked optional.

```markdown
# BPR-### — [Short title]

## Status

`draft` | `ready` | `in-progress` | `done`

## Context

Why this task exists. Link to the product feature ID if applicable (e.g. "Implements feature 5 from product.md"). Describe the user-facing problem or goal in 2-3 sentences so an agent understands the motivation without reading the full PRD.

## Scope

What is included in this task and, critically, what is NOT. Be explicit about boundaries so the implementing agent does not over-build.

- **In scope:** bullet list of what to build/change.
- **Out of scope:** bullet list of what to leave alone.

## Requirements

Numbered list of concrete requirements. Each requirement should be specific enough that an agent can implement it without guessing. Reference design tokens, component names, file paths, or API patterns where relevant.

1. ...
2. ...
3. ...

## Design references

Relevant colours, tokens, or UI patterns from `design.md`. Include the specific hex values, CSS variable names, or component styles the agent should use. Skip this section if the task has no UI component.

## Definition of done

Checklist of testable, verifiable outcomes. Each item should be something an agent can confirm by running the app, checking the DOM, running a test, or running `yarn lint`. Phrase each as a pass/fail assertion.

- [ ] [Observable outcome that can be verified in browser or terminal]
- [ ] [Another verifiable outcome]
- [ ] `yarn lint` passes with no new errors.
- [ ] No unrelated files are modified.

## Technical notes (optional)

Implementation hints, gotchas, or pointers to relevant code. Only include if there is non-obvious context that would save the implementing agent significant time. Do not prescribe architecture — let the agent decide how to build it.

## Dependencies (optional)

Other BPR tasks or features that must be completed before this one can start, or that this task unblocks.
```

### 6. Self-review the generated task

Run this self-review as the **code-mentor**: read `.claude/agents/code-mentor.md` and apply its review lens to the generated `BPR-###.md` task document. Phrase any findings in plain, layman-friendly language so a non-technical product manager can judge them — define any jargon you use. This reviews the **task document only**, not the app codebase, and does not implement the task.

After writing the file, re-read it and evaluate it against the following checklist. This is a quality gate — fix any issues before showing the task to the user.

#### Clarity — can an agent implement this without guessing?
- [ ] Every requirement has a single clear interpretation. If a developer could read it two ways, rewrite it.
- [ ] No requirement uses vague language ("appropriate", "properly", "as expected", "handle gracefully"). Replace with specific observable behaviour.
- [ ] File paths, design tokens, CSS variables, and component names referenced in the task actually exist in the repo (verify by reading the relevant files).

#### Completeness — are there gaps an agent would stumble on?
- [ ] All user-facing states and transitions are specified (idle, active, paused, ended, error, edge cases).
- [ ] Interaction with other features is explicitly defined (what is mutually exclusive, what composes, what is independent).
- [ ] The definition of done covers every requirement — no requirement is left without a matching verifiable outcome.
- [ ] The scope section explicitly lists what is out of scope to prevent over-building.

#### Consistency — does this align with the rest of the project?
- [ ] Requirements do not contradict `product.md` acceptance criteria.
- [ ] Design references match `design.md` tokens and state colours.
- [ ] No overlap or conflict with existing BPR tasks.

#### Implementability — can an agent verify "done" concretely?
- [ ] Every definition-of-done item is a pass/fail assertion verifiable by: running the app in a browser, inspecting the DOM, running `yarn lint`, or running a test.
- [ ] No definition-of-done item requires subjective judgement ("looks good", "feels responsive", "works correctly").

If any check fails, fix the task file before proceeding. If fixing requires information you don't have, add the question to the list you present to the user in step 7.

### 7. Present the task to the user

After the self-review passes, show the user:
- The file path and BPR number.
- A brief summary of what the task covers.
- Any remaining questions from the self-review that you could not resolve on your own.
- Ask if they want to adjust scope, requirements, acceptance criteria, or priority before marking it `ready`.

### 8. Finalise

If the user approves, set the status to `ready`. If they request changes, update the file accordingly — but do not add anything the user did not ask for. After any edits, re-run the self-review (step 6) on the changed sections to ensure the updates don't introduce new issues.
