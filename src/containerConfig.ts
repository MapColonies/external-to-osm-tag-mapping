import jsLogger from '@map-colonies/js-logger';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import redis from 'ioredis';
import { DependencyContainer, instancePerContainerCachingFactory } from 'tsyringe';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { Registry } from 'prom-client';
import { ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import { createConnection } from './common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { getSchemas } from './schema/providers/schemaLoader';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { ConfigType, getConfig, initConfig } from './common/config';
import { getTracing } from './common/tracing';

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  await initConfig(true);
  const cleanupRegistry = new CleanupRegistry();
  const config = getConfig();
  const metricsRegistry = new Registry();
  metricsRegistry.setDefaultLabels({});
  config.initializeMetrics(metricsRegistry);

  try {
    const bootstrapContainer = await registerDependencies(
      [{ token: SERVICES.CONFIG, provider: { useValue: config } }],
      options?.override,
      options?.useChild
    );

    const schemas = await getSchemas(bootstrapContainer);

    const dependencies: InjectionObject<unknown>[] = [
      { token: SERVICES.CONFIG, provider: { useValue: config } },
      { token: SERVICES.METRICS, provider: { useValue: metricsRegistry } },
      { token: SERVICES.CLEANUP_REGISTRY, provider: { useValue: cleanupRegistry } },
      {
        token: SERVICES.LOGGER,
        provider: {
          useFactory: instancePerContainerCachingFactory((container) => {
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);
            const loggerConfig = config.get('telemetry.logger');
            return jsLogger({ ...loggerConfig, mixin: getOtelMixin() });
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
        token: SERVICES.TRACER,
        provider: {
          useFactory: instancePerContainerCachingFactory((container) => {
            const cleanup = container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
            cleanup.register({ id: SERVICES.TRACER, func: getTracing().stop.bind(getTracing()) });
            return trace.getTracer(SERVICE_NAME);
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
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);
            const cleanup = container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);

            const redisConfig = config.get('db.redis');

            if (!redisConfig) {
              return undefined;
            }

            const { prefix, connectTimeoutMs, tls, ...rest } = redisConfig;
            const usedPrefix = prefix ?? '';

            let tlsOptions = undefined;
            if (tls.enabled) {
              const { enabled, ...tlsCerts } = tls;
              tlsOptions = tlsCerts;
            }

            const redisConnection = await createConnection({
              ...rest,
              keyPrefix: usedPrefix,
              connectTimeout: connectTimeoutMs,
              ...(tlsOptions && { tls: tlsOptions }),
            });

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
