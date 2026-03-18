import redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';
import { RedisConfig } from './config';

const RETRY_DELAY_INCREASE = 50;
const RETRY_DELAY_TOP = 2000;

const retryFunction = (times: number): number => {
  const delay = Math.min(times * RETRY_DELAY_INCREASE, RETRY_DELAY_TOP);
  return delay;
};

const createConnectionOptions = (config: RedisConfig): RedisOptions => {
  const { tls, dbIndex, ...rest } = config;

  let tlsOptions: RedisOptions['tls'] | undefined;
  if (tls.enabled) {
    const { enabled, ...tlsCerts } = tls;
    tlsOptions = tlsCerts;
  }

  return {
    db: dbIndex,
    ...rest,
    ...(tlsOptions && { tls: tlsOptions }),
    retryStrategy: retryFunction,
    lazyConnect: true,
    connectionName: HOSTNAME,
  };
};

export const createConnection = async (config: RedisConfig): Promise<redis> => {
  let redisInstance: redis | undefined;
  const redisOptions = createConnectionOptions(config);

  try {
    redisInstance = new redis(redisOptions);
    await redisInstance.connect();
    return redisInstance;
  } catch (err) {
    if (redisInstance) {
      redisInstance.disconnect();
    }
    let errorMessage = 'Redis connection failed';
    if (err instanceof Error) {
      errorMessage += ` with the following error: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
};
