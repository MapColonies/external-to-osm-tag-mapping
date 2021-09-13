/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { createServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { get } from 'config';
import { DEFAULT_SERVER_PORT, SERVICES } from './common/constants';
import { getApp } from './app';

interface IServerConfig {
  port: number;
}

const serverConfig = get<IServerConfig>('server');
const port: number = serverConfig.port || DEFAULT_SERVER_PORT;

void getApp()
  .then((app) => {
    const logger = container.resolve<Logger>(SERVICES.LOGGER);
    const server = createTerminus(createServer(app), {
      healthChecks: { '/liveness': container.resolve(SERVICES.HEALTHCHECK) },
      onSignal: container.resolve('onSignal'),
    });

    server.listen(port, () => {
      logger.info(`app started on port ${port}`);
    });
  })
  .catch((error: Error) => {
    console.error('😢 - failed initializing the server');
    console.error(error.message);
    const shutDown: () => Promise<void> = container.resolve('onSignal');
    void shutDown();
  });
