# Bieper

Bieper is a timer app for sports training — built for interval and reaction drills.

It can be accessed at https://bieper.pages.dev

## Tech stack

- **Next.js 16** (App Router) with **React 19**
- **TypeScript 5** (strict mode), path alias `@/*` → project root
- **Tailwind CSS v4** — CSS-first config; tokens live in `app/globals.css`, no `tailwind.config` file
- **shadcn/ui** (`base-nova` style, `@base-ui/react` under the hood, lucide icons)
- **Vitest** + React Testing Library for unit/component tests
- **yarn 1.22 (classic)** as the package manager

## Prerequisites

- **Node.js 20 or newer**
- **yarn 1.22 (classic)** — this project uses yarn only. Do not use `npm`, `pnpm`, or
  `npx` where a yarn equivalent exists, and never commit a `package-lock.json` or
  `pnpm-lock.yaml`.

## Getting started

Install dependencies:

```bash
yarn install
```

Run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Additional commands

```bash
yarn build        # production build
yarn start        # run the production build
yarn lint         # run ESLint
yarn test         # run the Vitest unit/component suite once
yarn test:watch   # run Vitest in watch mode
```

### Testing

Every feature ships **Vitest unit/component tests** co-located with the source
(`components/<name>.test.tsx`). Run `yarn test` (once) or `yarn test:watch` (watch mode).

In timer tests, mock `window.Audio` and drive time with `vi.useFakeTimers()`. Never
assert real audio playback — assert observable state only (rendered digits, `disabled`,
the `src` passed to `Audio`).

## Design assets

Audio assets sourced from Pixabay:

- [transcendedlifting](https://pixabay.com/users/transcendedlifting-30596364/)
- [freesound_community](https://pixabay.com/users/freesound_community-46691455/)
- [u_mzcig4o8yx](https://pixabay.com/sound-effects/search/u_mzcig4o8yx/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
