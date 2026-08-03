import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { apiConfig } from '../infrastructure/config.js';
import { runApplication } from '../runtime/application.js';
import { healthCheck } from './routes/health.js';

const v1 = new Hono();

export const app = new Hono()
  .use(
    '*',
    cors({
      allowHeaders: ['Authorization', 'Content-Type'],
      origin: (origin) => (apiConfig.allowedOrigins.includes(origin) ? origin : undefined),
    }),
  )
  .get('/healthz', async (c) => c.json(await runApplication(healthCheck)))
  .route('/v1', v1)
  .notFound((c) =>
    c.json(
      {
        code: 'route_not_found',
        status: 404,
        title: 'Not Found',
        type: 'https://yard.local/problems/not-found',
      },
      404,
    ),
  );
