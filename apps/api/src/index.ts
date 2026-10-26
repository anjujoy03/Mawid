import { config } from './config';
import { createApp } from './app';
import { startReminderJob } from './jobs/reminders';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();
const server = app.listen(config.PORT, () => {
  logger.info(`api listening on :${config.PORT}`, {
    moyasar: config.moyasarEnabled ? 'live' : 'mock',
    whatsapp: config.whatsappEnabled ? 'live' : 'dry-run',
  });
});

const reminders = startReminderJob();

async function shutdown() {
  clearInterval(reminders);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
