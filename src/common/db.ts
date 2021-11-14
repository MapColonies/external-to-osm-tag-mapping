import Redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';

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
    throw new Error('Redis connection failed');
  }
};
