import { Logger } from '@map-colonies/js-logger';
import Redis, { RedisOptions } from 'ioredis';
import { container } from 'tsyringe';
import { HOSTNAME, REDIS_CONNECTION_ERROR_CODE, SERVICES } from './constants';

export const createConnection = async (dbConfig: RedisOptions | string): Promise<Redis.Redis> => {
  try {
    let redis: Redis.Redis;
    if (typeof dbConfig === 'object') {
      dbConfig = {
        ...dbConfig,
        retryStrategy: (): null => null,
        reconnectOnError: (): 1 => 1,
        lazyConnect: true,
        connectionName: HOSTNAME,
      };
      redis = new Redis(dbConfig);
    } else {
      const url = new URL(dbConfig);
      if (url.searchParams.get('lazyConnect') === null) {
        url.searchParams.set('lazyConnect', 'true');
      }
      redis = new Redis(url.href);
    }
    await redis.connect();
    return redis;
  } catch (e) {
    const logger = container.resolve<Logger>(SERVICES.LOGGER);
    if (e instanceof Object) {
      logger.error(e, 'Redis connection failed');
    }
    throw e;
  }
};
