import redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';
import { RedisConfig } from './config';

const RETRY_DELAY_INCREASE = 50;
const RETRY_DELAY_TOP = 2000;

const retryFunction = (times: number): number => {
  const delay = Math.min(times * RETRY_DELAY_INCREASE, RETRY_DELAY_TOP);
  return delay;
};

const createConnectionOptions = (config: RedisConfig, overrides: Partial<RedisOptions> = {}): RedisOptions => {
  const { prefix, connectTimeoutMs, tls, ...rest } = config;

  let tlsOptions: RedisOptions['tls'] | undefined;
  if (tls.enabled) {
    const { enabled, ...tlsCerts } = tls;
    tlsOptions = tlsCerts;
  }

  return {
    ...rest,
    keyPrefix: prefix,
    connectTimeout: connectTimeoutMs,
    ...(tlsOptions && { tls: tlsOptions }),
    retryStrategy: retryFunction,
    lazyConnect: true,
    connectionName: HOSTNAME,
    ...overrides,
  };
};

export const createConnection = async (config: RedisConfig, overrides: Partial<RedisOptions> = {}): Promise<redis> => {
  let redisInstance: redis | undefined;
  const redisOptions = createConnectionOptions(config, overrides);

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
