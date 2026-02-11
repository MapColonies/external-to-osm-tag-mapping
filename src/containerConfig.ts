import jsLogger from '@map-colonies/js-logger';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import redis from 'ioredis';
import { DependencyContainer, instanceCachingFactory, instancePerContainerCachingFactory } from 'tsyringe';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { Registry } from 'prom-client';
import { ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import { createConnection } from './common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { ConfigType, getConfig } from './common/config';
import { getSchemas } from './schema/providers/schemaLoader';

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const cleanupRegistry = new CleanupRegistry();

  try {
    const bootstrapContainer = await registerDependencies(
      [{ token: SERVICES.CONFIG, provider: { useValue: getConfig() } }],
      options?.override,
      options?.useChild
    );

    const schemas = await getSchemas(bootstrapContainer);
    const dependencies: InjectionObject<unknown>[] = [
      { token: SERVICES.CONFIG, provider: { useValue: getConfig() } },
      {
        token: SERVICES.METRICS,
        provider: {
          useFactory: instanceCachingFactory((container) => {
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);
            const metricsRegistry = new Registry();
            config.initializeMetrics(metricsRegistry);

            return metricsRegistry;
          }),
        },
      },
      { token: SERVICES.CLEANUP_REGISTRY, provider: { useValue: cleanupRegistry } },
      { token: SERVICES.TRACER, provider: { useValue: trace.getTracer(SERVICE_NAME) } },
      {
        token: SERVICES.LOGGER,
        provider: {
          useFactory: instanceCachingFactory((container) => {
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);
            const loggerConfig = config.get('telemetry.logger');

            return jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });
          }),
        },
      },
      {
        token: SERVICES.APPLICATION,
        provider: {
          useFactory: instancePerContainerCachingFactory((container) => {
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);
            return config.get('application');
          }),
        },
      },
      {
        token: SERVICES.SCHEMAS,
        provider: { useValue: schemas },
      },
      {
        token: REDIS_SYMBOL,
        provider: {
          useFactory: instancePerContainerCachingFactory(async (container): Promise<redis | undefined> => {
            const cleanup = container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);
            const redisConnection = await createConnection(config);

            cleanup.register({
              id: REDIS_SYMBOL,
              func: async () => {
                await redisConnection.quit();
              },
            });

            return redisConnection;
          }),
        },
      },
      {
        token: IDOMAIN_FIELDS_REPO_SYMBOL,
        provider: {
          useFactory: async (container): Promise<RedisManager | Record<string, never>> => {
            const redisInstance = await container.resolve<Promise<redis | undefined>>(REDIS_SYMBOL);
            return redisInstance ? container.resolve(RedisManager) : {};
          },
        },
      },
      {
        token: SERVICES.HEALTHCHECK,
        provider: {
          useFactory: (container) => {
            return async (): Promise<void> => {
              const redisInstance = await container.resolve<Promise<redis | undefined>>(REDIS_SYMBOL);

              if (redisInstance) {
                const config = container.resolve<ConfigType>(SERVICES.CONFIG);
                const timeout = config.get('db.redis.connectTimeoutMs');

                await Promise.race([redisInstance.ping(), new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), timeout))]);
              }
            };
          },
        },
      },
      {
        token: ON_SIGNAL,
        provider: {
          useValue: cleanupRegistry.trigger.bind(cleanupRegistry),
        },
      },
    ];

    return await registerDependencies(dependencies, options?.override, options?.useChild);
  } catch (error) {
    await cleanupRegistry.trigger();
    throw error;
  }
};

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}
