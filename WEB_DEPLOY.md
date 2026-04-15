# Web Deployment

This repo now supports a deployable Expo web build.

## Local web run

```bash
npm run web
```

## Production web build

```bash
npm run web:build
```

Build output is generated in `dist/`.

## Netlify deploy (recommended)

`netlify.toml` is configured to:
- run `npm run web:build`
- publish `dist/`
- rewrite all routes to `index.html` (single-page app navigation)

Set these environment variables in Netlify:
- `EXPO_PUBLIC_FLIGHTS_API_URL`
- `EXPO_PUBLIC_FLIGHTS_API_KEY`

Point `EXPO_PUBLIC_FLIGHTS_API_URL` to your backend endpoint, for example:

```text
https://natsu-production.up.railway.app/api/flights
```

## Vercel deploy

`vercel.json` is configured to:
- run `npm run web:build`
- publish `dist/`
- rewrite all routes to `index.html` (single-page app navigation)

Set these environment variables in Vercel:
- `EXPO_PUBLIC_FLIGHTS_API_URL`
- `EXPO_PUBLIC_FLIGHTS_API_KEY`

Point `EXPO_PUBLIC_FLIGHTS_API_URL` to your backend endpoint, for example:

```text
https://natsu-production.up.railway.app/api/flights
```

## Data parity with mobile app

The web app reads the same runtime API variables and uses the same trip data flow as iOS/Android.
The trip map uses a web-compatible renderer with the same pins, statuses, and route segment data.
