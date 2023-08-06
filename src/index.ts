/* eslint-disable import/first */
// this import must be called before the first import of tsyringe
import 'reflect-metadata';
import './common/tracing';
import http from 'http';
import { HealthCheck, createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import config from 'config';
import { DEFAULT_SERVER_PORT, ON_SIGNAL, SERVICES } from './common/constants';
import { getApp } from './app';

const port: number = config.get<number>('server.port') || DEFAULT_SERVER_PORT;

void getApp()
  .then((app) => {
    const logger = container.resolve<Logger>(SERVICES.LOGGER);
    const healthCheck = container.resolve<HealthCheck>(SERVICES.HEALTHCHECK);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const server = createTerminus(http.createServer(app), { healthChecks: { '/liveness': healthCheck, onSignal: container.resolve(ON_SIGNAL) } });

    server.listen(port, () => {
      logger.info(`app started on port ${port}`);
    });
  })
  .catch(async (error: Error) => {
    console.error('😢 - failed initializing the server');
    console.error(error.message);
    const shutDown: () => Promise<void> = container.resolve(ON_SIGNAL);
    await shutDown();
  });
