import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/api.routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
          cb(null, true);
        } else {
          cb(null, true); // permissive for Capacitor / mobile during v1
        }
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, status: 'ok', service: 'constantino-api' });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/auth', authRoutes);
  app.use('/api', authRoutes);

  // Cron endpoint (secret header) — before authenticated api routes
  app.post('/api/cron/recorrentes', async (req, res, next) => {
    try {
      const { env } = await import('./config/env');
      const { gerarRecorrentes } = await import('./services/despesa.service');
      if (req.headers['x-cron-secret'] !== env.CRON_SECRET) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const data = await gerarRecorrentes();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
