@AGENTS.md

`.claude/CLAUDE.md` is the canonical project guide for this repository. Every future Claude session should read it before touching code. The root `CLAUDE.md` and `AGENTS.md` files chain into this one — do not duplicate content into the root.

# Project: Bieper

A timer app for combat sports training. Currently at the scaffold stage — the UI under `app/page.tsx` is still the default `create-next-app` template and has not yet been replaced with timer functionality.

# Tech stack

- **Next.js 16.2.3** — App Router. This version is newer than your training cutoff; APIs and conventions may have changed. Before writing Next.js code, read the relevant guide under `node_modules/next/dist/docs/` and heed deprecation notices.
- **React 19.2.4**
- **TypeScript 5** — strict mode, `moduleResolution: bundler`, path alias `@/*` → `./*` (see `tsconfig.json`).
- **Tailwind CSS v4** — wired through `@tailwindcss/postcss` in `postcss.config.mjs`. Global styles and `@theme` tokens live in `app/globals.css`; there is no `tailwind.config.*` file (v4 uses CSS-first config). `globals.css` also `@import`s `shadcn/tailwind.css` and `tw-animate-css`.
- **shadcn/ui** — installed via the `shadcn` CLI (devDependency) and configured in `components.json` with `style: "base-nova"`, `baseColor: "neutral"`, `iconLibrary: "lucide"`, RSC + TSX, and the `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks` aliases. Components are copied into `components/ui/`.
- **ESLint 9** — flat config in `eslint.config.mjs` extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- **Package manager: yarn 1.22 (classic)** — always use `yarn`, never `npm` or `pnpm`. Always add new packages using only `yarn`, never `npm` or `pnpm` or `npx` (if there is a yarn equivalent). Do not commit a `package-lock.json` or `pnpm-lock.yaml`.

# Commands

- `yarn install` — install dependencies
- `yarn dev` — start the dev server at http://localhost:3000
- `yarn build` — production build
- `yarn start` — run the production build
- `yarn lint` — run ESLint
- `yarn test` — run Vitest unit/component tests once
- `yarn test:watch` — Vitest in watch mode
- `yarn test:e2e` — run the Playwright E2E suite

# Testing

- Every feature ships **Vitest unit/component tests** co-located with the source (`components/<name>.test.tsx`) **and** a **Playwright E2E spec** under `e2e/`. Config lives in `vitest.config.ts` / `vitest.setup.ts` and `playwright.config.ts`.
- Mock `window.Audio` and drive time with `vi.useFakeTimers()` in unit tests; never assert real audio playback — assert observable state (rendered digits, `disabled`, the `src` passed to `Audio`).
- Playwright runs Chromium only; its `webServer` launches `yarn dev` (never `build`/`start`).

# Repository layout

```
app/               # Next.js App Router entry
  layout.tsx       # Root layout — loads Geist fonts, sets <html>/<body>
  page.tsx         # Home route (still the scaffold template)
  design-system/   # Internal design-system preview route (colour swatches, audio cues, etc.)
  globals.css      # Tailwind v4 + shadcn import, @theme tokens, CSS-var theme (:root + .dark)
  favicon.ico
components/
  ui/              # shadcn/ui primitives (base-nova style, @base-ui/react under the hood)
public/            # Static assets served from /
  audio/           # Timer sound cues — served at /audio/<file>
    timer-start.mp3  # Bell played when the timer starts
    timer-stop.mp3   # Bell played when the timer stops / ends
    interval.mp3     # Short cue for interval beeps and reaction triggers
components.json    # shadcn/ui CLI config (style, aliases, icon library)
next.config.ts     # Next config (currently empty)
eslint.config.mjs  # Flat ESLint config
postcss.config.mjs # Tailwind v4 via @tailwindcss/postcss
tsconfig.json      # Strict TS, @/* path alias
.claude/           # Claude Code project instructions (this file + AGENTS.md)
  docs/
    product.md     # Product requirements, milestones, priorities, release plan
    design.md      # Design palette, colour tokens, typography, timer-state colours
  skills/.         # Skills for claude
```

# Coding guidelines

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
- The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"
- For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Product requirements

The product requirements, development priorities, and release plan live in `.claude/docs/product.md`. Read it before starting any feature work. Key points:

- **Milestones define scope** — features are grouped into milestones (MVP, Enhanced, Polish). Implement in milestone order.
- **Priorities within milestones** — P0 (must have), P1 (should have), P2 (nice to have). Do not start P2 work while P0 items remain incomplete in the same milestone.
- **Acceptance criteria are the definition of done** — a feature is not complete until every acceptance criterion listed in the PRD is met.
- **Open questions block implementation** — if a feature references an unresolved open question, flag it to the user rather than guessing.
- **Release exit criteria** — check the release plan section before declaring a milestone shippable.

# Design

The design palette and UI guidelines live in `.claude/docs/design.md`. Read it before building or modifying any UI. Key points:

- **Dark-first, cool-toned palette** — Midnight/Navy backgrounds with Electric Blue, Cyan, Emerald, Amber, Red, and Violet accents.
- **Timer-state colours** — each timer state (idle, ready, active, rest, stopped, react) has a dedicated colour defined in the design doc. Use these consistently across all timer UI.
- **Semantic CSS variable mapping** — the design doc specifies which palette tokens map to each shadcn `--variable` in `globals.css`. When theming, follow that mapping.
- **Typography** — timer digits use `font-mono` at large sizes; headings and body use `font-sans`.

# Skills

- **`/technical-review <file-path>`** — Reviews a spec document (product, design, etc.) against all repo context and presents findings as numbered questions for the user to answer. It never edits files on its own — the user decides what changes to make. Run this after updating any spec doc under `.claude/docs/` to validate it is implementation-ready.

# Conventions

- **Audio assets.** Timer sound cues live in `public/audio/` and are played from client components via `new Audio('/audio/<file>.mp3')`. Use kebab-case `.mp3` filenames named after the cue's purpose (`timer-start.mp3`, `timer-end.mp3`, `interval.mp3`). Don't import audio through the bundler — reference it by its public URL.
- Use the `@/*` path alias for imports from the project root rather than long relative paths.
- **Arrow functions.** Prefer `const` arrow functions over `function` declarations for all project-authored code — components, helpers, and default exports. For a default export, assign to a named `const` first, then `export default Name` (preserves the component's display name). shadcn primitives under `components/ui/*` are exempt — leave their `function` declarations as the CLI generates them.
- **`type` over `interface`.** Prefer `type` aliases over `interface` declarations for object shapes and props.
- **`async`/`await` over `.then()`.** Prefer `async`/`await` over Promise `.then()`/`.catch()` chains.
- Keep global styling in `app/globals.css` using Tailwind v4's `@theme` — no JS config file.
- Place route segments under `app/` following App Router conventions — but verify the exact conventions against `node_modules/next/dist/docs/` before introducing new patterns, since this Next.js version may differ from what you remember.
- Don't create `README`/docs files unless explicitly asked.
- **No build/deploy commands unless asked.** Never run `yarn build`, `yarn start`, or any build/deploy command unless the user explicitly requests it or a skill's `SKILL.md` explicitly declares it. `yarn lint` and `yarn dev` are fine — production builds are not.
