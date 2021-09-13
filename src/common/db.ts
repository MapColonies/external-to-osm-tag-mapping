import Redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';

export const createConnection = (dbConfig: RedisOptions): Redis.Redis => {
  try {
    return new Redis({
      ...dbConfig,
      retryStrategy: (): null => null,
      reconnectOnError: (): 1 => 1,
      connectionName: HOSTNAME
    });
  } catch (e) {
    throw new Error('Redis connection failed');
  }
};
