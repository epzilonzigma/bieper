<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent behaviour

All agents (subagents, skills, background tasks) must follow the coding guidelines in `CLAUDE.md`. The key rules are restated here for agents that do not inherit the full CLAUDE.md context.

## Ask first, code second

- Never assume intent. If a task has multiple interpretations, ask the user which one they mean before writing code.
- If a requirement in `product.md` or `design.md` is vague or has an open question, stop and ask — do not fill in the blanks.
- State assumptions explicitly before acting on them.

## Minimal, surgical changes

- Only touch files and lines directly required by the task.
- Do not refactor, reformat, add comments to, or "improve" code that is not part of the task.
- Do not add error handling, abstractions, or configurability beyond what was requested.
- Match the existing code style in the file you are editing.
- If your changes make something unused, clean up only what you orphaned — not pre-existing dead code.

## Verify before reporting done

- Define concrete success criteria before starting (e.g. "test X passes", "page renders without errors").
- Run `yarn lint` after code changes.
- **Never run `yarn build`, `yarn start`, or any build/deploy command** unless the user explicitly requests it or the skill's `SKILL.md` explicitly declares it. `yarn lint` and `yarn dev` are allowed.
- For UI changes, start the dev server and test in a browser before reporting complete.
- Every changed line should trace back to the user's request. If it doesn't, revert it.

## Read specs before implementing

- Read `product.md` before feature work — implement in milestone order, respect priorities.
- Read `design.md` before UI work — use the defined colour tokens and timer-state colours.
- Read the relevant Next.js guide under `node_modules/next/dist/docs/` before using any Next.js API.

## Testing

- Every feature ships **Vitest unit/component tests** co-located with the source (`components/<name>.test.tsx`).
- Commands: `yarn test` (run once), `yarn test:watch` (watch mode).
- In unit tests, mock `window.Audio` and drive time with `vi.useFakeTimers()`. Never assert real audio playback — assert observable state only.
