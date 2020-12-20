//this import must be called before the first import of tsyring
import './tests/unit/node_modules/reflect-metadata';
import { config as initDotEnv } from 'dotenv';
import { Probe } from '@map-colonies/mc-probe';
import { container } from 'tsyringe';
import { MCLogger } from '@map-colonies/mc-logger';
import { getApp } from './src/app';

const DEFAULT_PORT = 80;

async function main(): Promise<void> {
  initDotEnv();
  const port =
    process.env.SERVER_PORT != null
      ? parseInt(process.env.SERVER_PORT)
      : DEFAULT_PORT;
  const app = await getApp();
  const probe = container.resolve(Probe);
  await probe.start(app, port);
  probe.readyFlag = true;
}

main().catch(() => {
  const logger = container.resolve<MCLogger>(MCLogger);
  logger.log('error', 'failed starting the app');
});
