import Redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';

export const createConnection = async (dbConfig: RedisOptions): Promise<Redis.Redis> => {
  try {
    const redis = new Redis({
      ...dbConfig,
      retryStrategy: (): null => null,
      reconnectOnError: (): 1 => 1,
      lazyConnect: true,
      connectionName: HOSTNAME,
    });
    await redis.connect();
    return redis;
  } catch (e) {
    throw new Error('Redis connection failed');
  }
};
