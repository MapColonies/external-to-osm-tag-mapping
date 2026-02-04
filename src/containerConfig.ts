import jsLogger from '@map-colonies/js-logger';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import redis, { RedisOptions } from 'ioredis';
import { DependencyContainer, instancePerContainerCachingFactory } from 'tsyringe';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { Registry } from 'prom-client';
import { ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import { createConnection } from './common/db';

import { IApplication } from './common/interfaces';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { schemaSymbol } from './schema/models/types';
import { getSchemas } from './schema/providers/schemaLoader';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { ConfigType, getConfig, initConfig } from './common/config';
import { getTracing } from './common/tracing';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}
export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  await initConfig(true);
  const cleanupRegistry = new CleanupRegistry();
  const config = getConfig();
  const metricsRegistry = new Registry();
  metricsRegistry.setDefaultLabels({});
  // config.initializeMetrics(metricsRegistry);

  try {
    const bootstrapContainer = await registerDependencies(
      [{ token: SERVICES.CONFIG, provider: { useValue: config } }],
      options?.override,
      options?.useChild
    );

    const schemas = await getSchemas(bootstrapContainer);

    const connectToExternal = schemas.some((s) => s.enableExternalFetch === 'yes');
    let redisConnection: redis | undefined;
    if (connectToExternal) {
      const { keyPrefix, ...redisConfig } = config.get('db') as RedisOptions;
      const prefix = typeof keyPrefix === 'string' && keyPrefix.length > 0 ? `${keyPrefix}:` : undefined;
      redisConnection = await createConnection({
        ...(redisConfig as RedisOptions),
        keyPrefix: prefix,
      });
    }

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
            return config.get('application') as IApplication;
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
        token: schemaSymbol,
        provider: { useValue: schemas },
      },
      {
        token: REDIS_SYMBOL,
        provider: { useValue: redisConnection },
      },
      {
        token: IDOMAIN_FIELDS_REPO_SYMBOL,
        provider: {
          useFactory: instancePerContainerCachingFactory((container) => {
            const redis = container.resolve<redis | undefined>(REDIS_SYMBOL);
            return redis ? container.resolve(RedisManager) : {};
          }),
        },
      },
      {
        token: SERVICES.HEALTHCHECK,
        provider: {
          useFactory: (container) => {
            const timeout = config.get('db.timeout');
            return async (): Promise<void> => {
              const redis = container.resolve<redis | undefined>(REDIS_SYMBOL);
              if (redis) {
                await Promise.race([redis.ping(), new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), timeout))]);
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
