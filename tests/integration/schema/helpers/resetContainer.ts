// helpers/resetContainer.ts
import { DependencyContainer } from 'tsyringe';
import redis from 'ioredis';
import { trace } from '@opentelemetry/api';
import jsLogger from '@map-colonies/js-logger';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { getApp } from '@src/app';
import { ConfigType, IApplication } from '@src/common/config';
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
    const redisConfig = realConfig.get('redis');
    const usedRedisConfig = {
      ...redisConfig,
      ...redisOptions,
    };

    const configWithOverride = {
      ...realConfig,
      get(key: string) {
        if (key === 'application') {
          return appConfig;
        }
        if (key === 'redis') {
          return usedRedisConfig;
        }
        return realConfig.get(key);
      },
    } as ConfigType;

    const redisConnectionPromise = createConnection(configWithOverride.get('redis'));
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

  afterAll(async function () {
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
