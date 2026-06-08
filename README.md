# Bieper

This is a timer app for mainly combat sports training.

## Getting Started

First, install dependencies

```bash
yarn install
```

Then, run the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing

Unit and component tests run on [Vitest](https://vitest.dev) + React Testing Library:

```bash
yarn test        # run the unit/component suite once
yarn test:watch  # re-run on change
```

End-to-end tests run on [Playwright](https://playwright.dev) against a live dev server (which it starts for you). The first time, install the Chromium browser — and, on Linux, its system libraries:

```bash
yarn playwright install chromium  # one-time: download the browser
sudo yarn playwright install-deps # one-time (Linux): install system libraries
yarn test:e2e                     # run the end-to-end suite
```


## Design assets

Audio assets sourced from Pixabay:

- [transcendedlifting](https://pixabay.com/users/transcendedlifting-30596364/)
- [freesound_community](https://pixabay.com/users/freesound_community-46691455/)
- [u_mzcig4o8yx](https://pixabay.com/sound-effects/search/u_mzcig4o8yx/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
