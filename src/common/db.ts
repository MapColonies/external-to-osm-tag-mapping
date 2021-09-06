import Redis, { RedisOptions } from 'ioredis';

export const createConnection = (dbConfig: RedisOptions): Redis.Redis => {
  try {
    return new Redis(dbConfig);
  } catch (e) {
    throw new Error('Redis connection failed');
  }
};
