import 'reflect-metadata';
import { Probe } from '@map-colonies/mc-probe';
import { container } from 'tsyringe';
import { get } from 'config';
import { getApp } from './app';
import { DEFAULT_SERVER_PORT } from './common/constants';
import { Services } from './common/constants';
import { ILogger } from './common/interfaces';

interface IServerConfig {
  port: number;
}

const serverConfig = get<IServerConfig>('server');
const port: number = serverConfig.port || DEFAULT_SERVER_PORT;
const app = getApp();
const probe = container.resolve(Probe);
const logger = container.resolve<ILogger>(Services.LOGGER);

probe
  .start(app, port)
  .then(() => {
    logger.log('info', `app listening on port ${port}`);
  })
  .catch(e => logger.log('error', `app could not start`, e));
