import redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';
import { ConfigType } from './config';

const RETRY_DELAY_INCREASE = 50;
const RETRY_DELAY_TOP = 2000;

const retryFunction = (times: number): number => {
  const delay = Math.min(times * RETRY_DELAY_INCREASE, RETRY_DELAY_TOP);
  return delay;
};

const createConnectionOptions = (config: ConfigType, overrides: Partial<RedisOptions> = {}): RedisOptions => {
  console.log('NAZI1', overrides);
  const redisConfig = config.get('db.redis');

  if (!redisConfig) {
    throw new Error("Config doesn't have redis");
  }

  const { prefix, connectTimeoutMs, tls, ...rest } = redisConfig;
  const usedPrefix = prefix ?? '';

  let tlsOptions: RedisOptions['tls'] | undefined;
  if (tls.enabled) {
    const { enabled, ...tlsCerts } = tls;
    tlsOptions = tlsCerts;
  }
  // console.log('NAZI2', {
  //   ...rest,
  //   keyPrefix: usedPrefix,
  //   connectTimeout: connectTimeoutMs,
  //   ...(tlsOptions && { tls: tlsOptions }),
  //   retryStrategy: retryFunction,
  //   lazyConnect: true,
  //   connectionName: HOSTNAME,
  //   ...overrides,
  // });

  return {
    ...rest,
    keyPrefix: usedPrefix,
    connectTimeout: connectTimeoutMs,
    ...(tlsOptions && { tls: tlsOptions }),
    retryStrategy: retryFunction,
    lazyConnect: true,
    connectionName: HOSTNAME,
    ...overrides,
  };
};

export const createConnection = async (config: ConfigType, overrides: Partial<RedisOptions> = {}): Promise<redis> => {
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
