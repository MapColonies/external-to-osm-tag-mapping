import { RedisOptions } from 'ioredis';
import { getConfig } from '../../common/config';

export const getRedisConfig = (): RedisOptions => {
  const config = getConfig();

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
  };
};
