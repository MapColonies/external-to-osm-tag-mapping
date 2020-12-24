import 'reflect-metadata';
import { Probe } from '@map-colonies/mc-probe';
import { container } from 'tsyringe';
import { get } from 'config';
import { getApp } from './app';
import { DEFAULT_SERVER_PORT } from './common/constants';

interface IServerConfig {
  port: string;
}

const serverConfig = get<IServerConfig>('server');
const port: number = parseInt(serverConfig.port) || DEFAULT_SERVER_PORT;
const app = getApp();
const probe = container.resolve(Probe);
probe
  .start(app, port)
  .then(() => {
    console.log('live');
  })
  .catch(console.error);
