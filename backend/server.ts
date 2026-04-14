import express from 'express';
import flightsHandler from '../api/flights';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const host = '0.0.0.0';

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'natsu-backend',
    env: {
      notionToken: Boolean(process.env.NOTION_TOKEN),
      notionFlightsDbId: Boolean(process.env.NOTION_FLIGHTS_DB_ID),
      notionHotelsDbId: Boolean(process.env.NOTION_HOTELS_DB_ID),
      flightsSyncApiKey: Boolean(process.env.FLIGHTS_SYNC_API_KEY),
      notionDefaultTripId: Boolean(process.env.NOTION_DEFAULT_TRIP_ID),
      notionDefaultTripTitle: Boolean(process.env.NOTION_DEFAULT_TRIP_TITLE),
    },
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({ ok: true, service: 'natsu-backend' });
});

app.get('/api/flights', async (req, res) => {
  await flightsHandler(req, res);
});

app.all('/api/flights', (req, res) => {
  res.setHeader('Allow', 'GET');
  res.status(405).json({
    error: {
      code: 'method_not_allowed',
      message: `Method ${req.method} is not allowed. Use GET.`,
    },
  });
});

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://${host}:${port}`);
});
