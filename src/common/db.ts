import Redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';

const RETRY_DELAY_INCREASE = 50;
const RETRY_DELAY_TOP = 2000;

const retryFunction = (times: number): number => {
  const delay = Math.min(times * RETRY_DELAY_INCREASE, RETRY_DELAY_TOP);
  return delay;
};

export const createConnection = async (redisOptions: RedisOptions): Promise<Redis> => {
  let redis: Redis | undefined;

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
    redis?.disconnect();
    throw err;
  }
};
