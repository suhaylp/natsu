# Backend Hosting Without Vercel (Railway)

This repo now includes a standard Node backend server for the flights endpoint.

## Local run

1. Export backend env vars:

```bash
export NOTION_TOKEN=...
export NOTION_FLIGHTS_DB_ID=...
export FLIGHTS_SYNC_API_KEY=...
export PORT=3001
```

2. Start backend:

```bash
npm run backend:start
```

3. Set app env:

```env
EXPO_PUBLIC_FLIGHTS_API_URL=http://localhost:3001/api/flights
EXPO_PUBLIC_FLIGHTS_API_KEY=<same FLIGHTS_SYNC_API_KEY>
```

## Railway deployment

1. Create new Railway project from this repo.
2. Set start command to:

```bash
npm run backend:start
```

3. Add env vars in Railway:

- `NOTION_TOKEN`
- `NOTION_FLIGHTS_DB_ID`
- `FLIGHTS_SYNC_API_KEY`
- `PORT` (optional, Railway usually provides this automatically)

4. After deploy, copy your Railway URL and set:

```env
EXPO_PUBLIC_FLIGHTS_API_URL=https://<your-railway-domain>/api/flights
EXPO_PUBLIC_FLIGHTS_API_KEY=<same FLIGHTS_SYNC_API_KEY>
```

5. Restart Expo:

```bash
npx expo start -c
```
