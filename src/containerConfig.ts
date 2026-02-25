import jsLogger, { Logger } from '@map-colonies/js-logger';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import redis from 'ioredis';
import { DependencyContainer, instanceCachingFactory, instancePerContainerCachingFactory } from 'tsyringe';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { Registry } from 'prom-client';
import { ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME, redisConfigPath } from './common/constants';
import { createConnection } from './common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { ConfigType, getConfig } from './common/config';
import { SCHEMA_PROVIDER_SYMBOL, SchemaProviderConstructor, schemaProviderFactory } from './schema/providers/schemaLoader';
import { SCHEMA_ROUTER_SYMBOL, schemaRouterFactory } from './schema/routers/schemaRouter';

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const cleanupRegistry = new CleanupRegistry();

  try {
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
        token: SCHEMA_PROVIDER_SYMBOL,
        provider: { useFactory: instancePerContainerCachingFactory(schemaProviderFactory) },
        postInjectionHook: async (container): Promise<void> => {
          const provider = container.resolve<SchemaProviderConstructor>(SCHEMA_PROVIDER_SYMBOL);
          if (provider === undefined) {
            throw new Error('Schema provider is undefined');
          }
          const schemas = await container.resolve(provider).loadSchemas();

          container.register(SERVICES.SCHEMAS, { useValue: schemas });
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
        token: REDIS_SYMBOL,
        provider: {
          useFactory: instancePerContainerCachingFactory(async (container) => {
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);
            return createConnection(config.get(redisConfigPath));
          }),
        },
        postInjectionHook: async (deps: DependencyContainer): Promise<void> => {
          const logger = deps.resolve<Logger>(SERVICES.LOGGER);
          try {
            const redisPromise = deps.resolve<Promise<redis>>(REDIS_SYMBOL);
            const redis = await redisPromise;
            cleanupRegistry.register({
              id: REDIS_SYMBOL,
              func: redis.quit.bind(redis),
            });
          } catch (error) {
            logger.error({ msg: 'Connection to redis failed', error });
            throw error;
          }
        },
      },
      {
        token: IDOMAIN_FIELDS_REPO_SYMBOL,
        provider: {
          useFactory: async (container): Promise<RedisManager> => {
            const redisInstance = await container.resolve<Promise<redis>>(REDIS_SYMBOL);
            const config = container.resolve<ConfigType>(SERVICES.CONFIG);

            return new RedisManager(redisInstance, config);
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
                const timeout = config.get(redisConfigPath).connectTimeoutMs;

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
      {
        token: SCHEMA_ROUTER_SYMBOL,
        provider: {
          useFactory: instancePerContainerCachingFactory(schemaRouterFactory),
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
