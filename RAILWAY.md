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
2. Set **Root Directory** to repo root (leave blank unless your app is in a subfolder).
3. Set **Start Command** to:

```bash
npm run backend:start
```

4. Set **Healthcheck Path** to:

```bash
/health
```

5. Add env vars in Railway:

- `NOTION_TOKEN`
- `NOTION_FLIGHTS_DB_ID`
- `FLIGHTS_SYNC_API_KEY`
- `PORT` (optional; Railway usually injects it automatically)

6. After deploy, copy your Railway URL and set:

```env
EXPO_PUBLIC_FLIGHTS_API_URL=https://<your-railway-domain>/api/flights
EXPO_PUBLIC_FLIGHTS_API_KEY=<same FLIGHTS_SYNC_API_KEY>
```

7. Restart Expo:

```bash
npx expo start -c
```

## If Railway shows "Application failed to respond"

1. Open the latest deployment logs and confirm the process starts with:

```bash
> npm run backend:start
```

2. Confirm logs include:

```bash
Backend listening on http://localhost:<port>
```

3. If you see `tsx: command not found`, redeploy from latest commit in this repo (tsx is now a production dependency).
4. If `/health` still fails, verify the service target port matches Railway's public networking port and restart deployment.
