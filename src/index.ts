// this import must be called before the first import of tsyring
import 'reflect-metadata';
import './common/tracing';
import { createServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { DependencyContainer } from 'tsyringe';
import { DEFAULT_SERVER_PORT, ON_SIGNAL, SERVICES } from './common/constants';
import { ConfigType } from './common/config';
import { getApp } from './app';

let depContainer: DependencyContainer | undefined;

void getApp()
  .then(([app, container]) => {
    const logger = container.resolve<Logger>(SERVICES.LOGGER);
    const config = container.resolve<ConfigType>(SERVICES.CONFIG);
    const port: number = config.get('server.port') || DEFAULT_SERVER_PORT;

    const server = createTerminus(createServer(app), {
      healthChecks: { '/liveness': container.resolve(SERVICES.HEALTHCHECK) },
      onSignal: container.resolve(ON_SIGNAL),
    });

    depContainer = container;

    server.listen(port, () => {
      logger.info(`app started on port ${port}`);
    });
  })
  .catch(async (error: Error) => {
    console.error('😢 - failed initializing the server');
    console.error(error);

    if (depContainer !== undefined && depContainer.isRegistered(ON_SIGNAL)) {
      const shutDown = depContainer.resolve<() => Promise<void>>(ON_SIGNAL);
      await shutDown();
    }

    process.exit(1);
  });
