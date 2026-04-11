@AGENTS.md

`.claude/CLAUDE.md` is the canonical project guide for this repository. Every future Claude session should read it before touching code. The root `CLAUDE.md` and `AGENTS.md` files chain into this one — do not duplicate content into the root.

# Project: Bieper

A timer app for combat sports training. Currently at the scaffold stage — the UI under `app/page.tsx` is still the default `create-next-app` template and has not yet been replaced with timer functionality.

# Tech stack

- **Next.js 16.2.3** — App Router. This version is newer than your training cutoff; APIs and conventions may have changed. Before writing Next.js code, read the relevant guide under `node_modules/next/dist/docs/` and heed deprecation notices.
- **React 19.2.4**
- **TypeScript 5** — strict mode, `moduleResolution: bundler`, path alias `@/*` → `./*` (see `tsconfig.json`).
- **Tailwind CSS v4** — wired through `@tailwindcss/postcss` in `postcss.config.mjs`. Global styles and `@theme` tokens live in `app/globals.css`; there is no `tailwind.config.*` file (v4 uses CSS-first config).
- **ESLint 9** — flat config in `eslint.config.mjs` extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- **Package manager: yarn 1.22 (classic)** — always use `yarn`, never `npm` or `pnpm`. Do not commit a `package-lock.json` or `pnpm-lock.yaml`.

# Commands

- `yarn install` — install dependencies
- `yarn dev` — start the dev server at http://localhost:3000
- `yarn build` — production build
- `yarn start` — run the production build
- `yarn lint` — run ESLint

# Repository layout

```
app/               # Next.js App Router entry
  layout.tsx       # Root layout — loads Geist fonts, sets <html>/<body>
  page.tsx         # Home route (still the scaffold template)
  globals.css      # Tailwind v4 import + @theme tokens + :root vars
  favicon.ico
public/            # Static assets served from /
  audio/           # Timer sound cues (start, end, interval) — served at /audio/<file>
next.config.ts     # Next config (currently empty)
eslint.config.mjs  # Flat ESLint config
postcss.config.mjs # Tailwind v4 via @tailwindcss/postcss
tsconfig.json      # Strict TS, @/* path alias
.claude/           # Claude Code project instructions (this file + AGENTS.md)
```

# Conventions

- **Audio assets.** Timer sound cues live in `public/audio/` and are played from client components via `new Audio('/audio/<file>.mp3')`. Use kebab-case `.mp3` filenames named after the cue's purpose (`timer-start.mp3`, `timer-end.mp3`, `interval.mp3`). Don't import audio through the bundler — reference it by its public URL.
- Use the `@/*` path alias for imports from the project root rather than long relative paths.
- Keep global styling in `app/globals.css` using Tailwind v4's `@theme` — no JS config file.
- Place route segments under `app/` following App Router conventions — but verify the exact conventions against `node_modules/next/dist/docs/` before introducing new patterns, since this Next.js version may differ from what you remember.
- Don't create `README`/docs files unless explicitly asked.
