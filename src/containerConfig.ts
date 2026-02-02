import jsLogger, { Logger } from '@map-colonies/js-logger';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import Redis from 'ioredis';
import { RedisOptions } from 'ioredis';
import { DependencyContainer, instancePerContainerCachingFactory } from 'tsyringe';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import { createConnection } from './common/db';

import { IApplication } from './common/interfaces';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { Schema, schemaSymbol } from './schema/models/types';
import { getSchemas } from './schema/providers/schemaLoader';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { ConfigType, getConfig, initConfig } from './common/config';
import { getTracing } from './common/tracing';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}
export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  await initConfig();
  const cleanupRegistry = new CleanupRegistry();
  const config = getConfig();

  try {
    // FIX 1: Add 'await' here so bootstrapContainer is a DependencyContainer, not a Promise
    const bootstrapContainer = await registerDependencies(
      [{ token: SERVICES.CONFIG, provider: { useValue: config } }],
      options?.override,
      options?.useChild
    );

    // Now getSchemas can properly use the container to resolve the provider
    const schemas = await getSchemas(bootstrapContainer);

    const dependencies: InjectionObject<unknown>[] = [
      { token: SERVICES.CONFIG, provider: { useValue: config } },
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
        provider: {
          useFactory: instancePerContainerCachingFactory(async (container) => {
            const schemas = container.resolve<Schema[]>(schemaSymbol);
            const connectToExternal = schemas.some((s) => s.enableExternalFetch === 'yes');

            if (!connectToExternal) {
              return undefined;
            }

            const config = container.resolve<ConfigType>(SERVICES.CONFIG);

            // 1. Get as 'unknown' or 'any' first to satisfy config.get's strict string constraints
            // and bypass the "always truthy" linting error.
            const { keyPrefix, ...redisConfig } = config.get('db') as RedisOptions;

            // We use a type guard or simple check for keyPrefix
            const prefix = typeof keyPrefix === 'string' && keyPrefix.length > 0 ? `${keyPrefix}:` : undefined;

            const connection = await createConnection({
              ...(redisConfig as RedisOptions), // Force cast the rest object
              keyPrefix: prefix,
            });

            const logger = container.resolve<Logger>(SERVICES.LOGGER);
            connection.on('connect', () => logger.info('redis client is connected.'));
            connection.on('error', (err: Error) => logger.error({ err, msg: 'redis client error' }));

            return connection;
          }),
        },
      },
      {
        token: IDOMAIN_FIELDS_REPO_SYMBOL,
        provider: {
          useFactory: instancePerContainerCachingFactory((container) => {
            const redis = container.resolve<Redis | undefined>(REDIS_SYMBOL);
            return redis ? container.resolve(RedisManager) : {};
          }),
        },
      },
      {
        token: SERVICES.HEALTHCHECK,
        provider: {
          useFactory: (container) => {
            return async (): Promise<void> => {
              const redis = container.resolve<Redis | undefined>(REDIS_SYMBOL);
              if (redis) {
                await redis.ping();
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
