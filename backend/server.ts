import express from 'express';
import flightsHandler from '../api/flights';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const host = '0.0.0.0';

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
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
