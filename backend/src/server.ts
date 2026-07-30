import cron from 'node-cron';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { gerarRecorrentes } from './services/despesa.service';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();

  if (env.ENABLE_CRON && env.NODE_ENV !== 'test') {
    cron.schedule('0 6 * * *', async () => {
      try {
        const result = await gerarRecorrentes();
        console.log('Recorrentes geradas:', result.geradas);
      } catch (err) {
        console.error('Erro ao gerar recorrentes', err);
      }
    });
  }

  app.listen(env.PORT, () => {
    console.log(`Constantino API on :${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
