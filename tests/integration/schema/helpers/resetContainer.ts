// helpers/resetContainer.ts
import { DependencyContainer } from 'tsyringe';
import redis from 'ioredis';
import { trace } from '@opentelemetry/api';
import jsLogger from '@map-colonies/js-logger';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { getApp } from '@src/app';
import { ConfigType } from '@src/common/config';
import { IApplication } from '@src/common/interfaces';
import { REDIS_SYMBOL, SERVICES } from '@src/common/constants';
import { createConnection } from '@src/common/db';
import { SchemaRequestSender } from './requestSender';

export const setupRedisTestEnvironment = (
  getDepContainer: () => DependencyContainer,
  appConfig: IApplication,
  redisOptions?: { keyPrefix?: string }
): {
  getConnection: () => redis;
  getRequestSender: () => SchemaRequestSender;
  getContainer: () => DependencyContainer;
} => {
  let connection: redis;
  let requestSender: SchemaRequestSender;
  let container: DependencyContainer;

  beforeAll(async function () {
    const depContainer = getDepContainer();
    const realConfig = depContainer.resolve<ConfigType>(SERVICES.CONFIG);

    const configWithOverride = {
      ...realConfig,
      get(key: string) {
        if (key === 'application') {
          return appConfig;
        }
        return realConfig.get(key);
      },
    } as ConfigType;

    const redisConnectionPromise = createConnection(configWithOverride.get('redis'), redisOptions);
    const [app, containerInstance] = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: REDIS_SYMBOL, provider: { useValue: redisConnectionPromise } },
        { token: SERVICES.CONFIG, provider: { useValue: configWithOverride } },
      ],
      useChild: true,
    });

    connection = await redisConnectionPromise;
    requestSender = new SchemaRequestSender(app);
    container = containerInstance;
  });

  beforeEach(async function () {
    await connection.flushall();
  });

  // helpers/resetContainer.ts
  afterAll(async function () {
    // Close Redis connection first - be more aggressive
    if (connection.status !== 'end') {
      connection.disconnect(false); // false = don't wait for pending commands
    }

    const cleanupRegistry = container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    container.reset();
  });

  return {
    getConnection: () => connection,
    getRequestSender: () => requestSender,
    getContainer: () => container,
  };
};
