import redis, { RedisOptions } from 'ioredis';
import { HOSTNAME } from './constants';

const RETRY_DELAY_INCREASE = 50;
const RETRY_DELAY_TOP = 2000;
let redisInstance: redis;

const retryFunction = (times: number): number => {
  const delay = Math.min(times * RETRY_DELAY_INCREASE, RETRY_DELAY_TOP);
  // Log every retry attempt to see if it's even trying
  console.log(`[Redis] Retry attempt #${times}. Next delay: ${delay}ms`);
  return delay;
};

export const createConnection = async (redisOptions: RedisOptions): Promise<redis> => {
  // 1. Log the incoming config (minus sensitive info)
  console.log('--- Redis Connection Config ---');
  console.log(`Target Host: ${redisOptions.host}`);
  console.log(`Target Port: ${redisOptions.port}`);
  console.log(`Local Hostname: ${HOSTNAME}`);

  try {
    redisOptions = {
      ...redisOptions,
      retryStrategy: retryFunction,
      lazyConnect: true, // We want manual control via .connect()
      connectionName: HOSTNAME,
    };

    redisInstance = new redis(redisOptions);

    // 2. Add event listeners for deep visibility
    redisInstance.on('connect', () => console.log('[Redis] Status: TCP connection established.'));
    redisInstance.on('ready', () => console.log('[Redis] Status: Ready to receive commands.'));
    redisInstance.on('error', (err) => console.error('[Redis] Event Error:', err));
    redisInstance.on('reconnecting', () => console.log('[Redis] Status: Reconnecting...'));

    console.log('[Redis] Executing .connect()...');
    await redisInstance.connect();

    return redisInstance;
  } catch (err) {
    // 3. Ensure we log why the TRY block failed
    let errorMessage = 'Redis connection failed';
    if (err instanceof Error) {
      errorMessage += ` with the following error: ${err.message}`;
      // Log the stack trace for better context
      console.error('[Redis] Exception caught:', err.stack);
    }

    redisInstance.disconnect();

    throw new Error(errorMessage);
  }
};
