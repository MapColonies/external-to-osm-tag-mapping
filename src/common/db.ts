import redis, { RedisOptions } from 'ioredis';
import { DependencyContainer } from 'tsyringe';
import { HOSTNAME, SERVICES } from './constants';
import { ConfigType } from './config';

const RETRY_DELAY_INCREASE = 50;
const RETRY_DELAY_TOP = 2000;

const retryFunction = (times: number): number => {
  const delay = Math.min(times * RETRY_DELAY_INCREASE, RETRY_DELAY_TOP);
  return delay;
};

const createConnectionOptions = (config: ConfigType): RedisOptions => {
  const redisConfig = config.get('db.redis');

  if (!redisConfig) {
    throw new Error("Config doesn't have redis");
  }

  const { prefix, connectTimeoutMs, tls, ...rest } = redisConfig;
  const usedPrefix = prefix ?? '';

  let tlsOptions = undefined;
  if (tls.enabled) {
    const { enabled, ...tlsCerts } = tls;
    tlsOptions = tlsCerts;
  }

  return {
    ...rest,
    keyPrefix: usedPrefix,
    connectTimeout: connectTimeoutMs,
    ...(tlsOptions && { tls: tlsOptions }),
    retryStrategy: retryFunction,
    lazyConnect: true,
    connectionName: HOSTNAME,
  };
};

export const createConnection = async (container: DependencyContainer): Promise<redis> => {
  let redisInstance: redis | undefined;
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
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
