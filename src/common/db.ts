import { Logger } from '@map-colonies/js-logger';
import Redis, { RedisOptions } from 'ioredis';
import { container } from 'tsyringe';
import { HOSTNAME, SERVICES } from './constants';

export const createConnection = async (redisOptions: RedisOptions): Promise<Redis.Redis> => {
  try {
    redisOptions = {
      ...redisOptions,
      retryStrategy: (): null => null,
      reconnectOnError: (): 1 => 1,
      lazyConnect: true,
      connectionName: HOSTNAME,
    };
    const redis: Redis.Redis = new Redis(redisOptions);

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
