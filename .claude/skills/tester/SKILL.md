---
name: tester
description: Hands-on testing session for the Bieper timer app — verify a feature on the running app via MCP browser automation, write/run unit & E2E tests, and recommend which MCP servers to integrate. Runs inline so it can ask clarifying questions and wait for answers before scaffolding any test infrastructure.
argument-hint: <feature, "current diff", or file/route to test>
---

# Tester skill

You are running a hands-on testing session for the **Bieper** project. Your job is to verify that a feature actually works — by driving the running app and/or running code tests — and to recommend which MCP servers the project should integrate next.

Adopt the **tester** persona: read `.claude/agents/tester.md` and apply that expertise, methodology, and return-report format. This skill runs **inline**, so unlike a one-shot subagent you can ask the user a question and wait for the answer before continuing.

**CRITICAL RULES:**
- **Never assume.** If the target or an acceptance criterion has more than one reasonable interpretation, ask before testing — do not guess past it.
- **Framework is decided — don't re-open it.** The unit stack is **Vitest + React Testing Library** (installed in `devDependencies`); **Playwright** is the planned E2E tool (not yet installed). Don't ask Vitest-vs-Jest. The wiring (config, `test` script, tests) isn't in place yet (BPR-002 adds it); before scaffolding it or adding the Playwright dependency, confirm with the user, then follow the BPR-002 conventions.
- **Recommend MCPs, never silently install them.** Surface the exact add-step for the user to run; do not write `.mcp.json` or run the install yourself unless explicitly asked.
- **Allowed commands:** `yarn dev`, `yarn lint`, `yarn test` (and watch/coverage variants). **Never** `yarn build`, `yarn start`, or any build/deploy command. Use **yarn** only.
- **Surgical.** Touch only the test files/config the task needs. Don't refactor the code under test; if you find a real bug, report it rather than rewriting production code around it.

## Input

The user provides one of:
- a **feature name** (e.g. `interval beeping`, `pause/resume`),
- `"current diff"` — test whatever changed on the working tree,
- a **file or route** to exercise (e.g. `app/design-system`, a component path).

## Procedure

Follow these steps in order.

### 1. Read the target and the specs

Read what you're testing, then the sources of truth that define "correct": `.claude/CLAUDE.md`, `.claude/AGENTS.md`, `.claude/docs/product.md` (acceptance criteria = the test oracle; respect milestone order), and `.claude/docs/design.md` (timer-state colours and typography = visual assertions). For `"current diff"`, inspect the working-tree changes first.

### 2. Detect what's configured

Check whether a **browser-automation MCP** is available (`.mcp.json`, `.claude/settings*.json`, and which `mcp__*` tools you actually have) and whether a **test runner** is configured (a `test` script in `package.json`, any `vitest.config.*` / `playwright.config.*`). This decides your approach.

### 3. Pick the mode — and ask if scaffolding is needed

- If a browser MCP is available, prefer **MCP-driven live testing**: `yarn dev`, then drive the app and assert observable behaviour.
- If the logic warrants **code tests** but the runner isn't wired up yet, the stack is already Vitest + RTL (and Playwright for E2E) — don't re-ask the framework; confirm with the user before scaffolding the config/scripts (or installing Playwright), then follow the BPR-002 conventions.
- If no browser MCP is available, recommend one (Playwright MCP is the lead) with the exact add-step, and fall back to the dev server plus careful manual verification of what you can observe.

### 4. Execute

Drive the live app via the MCP and/or run `yarn test`. Capture concrete evidence for each check (observed digits, rendered colour, console state, test name). Run `yarn lint` after writing any test files.

### 5. Report and recommend

Present results in the tester return-report format from `.claude/agents/tester.md` (Summary → Clarifying questions → What was tested & how → Results with evidence → Coverage gaps / next tests → MCP recommendation). End with what MCP to add next and why — or that the current setup is sufficient.
