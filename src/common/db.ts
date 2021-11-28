import Redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';

let redis: Redis.Redis;

const retryFunction =  (times: number): number => {
  const delay = Math.min(times * 50, 2000);
  return delay;
}

export const createConnection = async (redisOptions: RedisOptions): Promise<Redis.Redis> => {
  try {
    redisOptions = {
      ...redisOptions,
      retryStrategy: retryFunction,
      lazyConnect: true,
      connectionName: HOSTNAME,
    };

    redis = new Redis(redisOptions);
    await redis.connect();
    return redis;
  } catch (err) {
    redis.disconnect();
    throw new Error(`Redis connection failed with the following error: ${err}`);
  }
};
