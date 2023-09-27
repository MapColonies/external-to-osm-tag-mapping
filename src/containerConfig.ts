import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace, metrics as OtelMetrics } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import config from 'config';
import Redis from 'ioredis';
import { RedisOptions } from 'ioredis';
import { Metrics } from '@map-colonies/telemetry';
import { container, instancePerContainerCachingFactory } from 'tsyringe';
import { ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import { createConnection } from './common/db';
import { IApplication } from './common/interfaces';
import { tracing } from './common/tracing';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { schemaSymbol } from './schema/models/types';
import { getSchemas } from './schema/providers/schemaLoader';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { schemaRouterFactory, SCHEMA_ROUTER_SYMBOL } from './schema/routers/schemaRouter';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  container.register(SERVICES.CONFIG, { useValue: config });
  container.register(SERVICES.APPLICATION, { useValue: config.get<IApplication>('application') });

  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  const logger = jsLogger({ ...loggerConfig, mixin: getOtelMixin() });

  const metrics = new Metrics();
  metrics.start();

  container.register(SERVICES.LOGGER, { useValue: logger });

  const tracer = trace.getTracer(SERVICE_NAME);
  container.register(SERVICES.TRACER, { useValue: tracer });

  const schemas = await getSchemas(container);

  const connectToExternal = schemas.some((schema) => {
    return schema.enableExternalFetch === 'yes';
  });

  let redisConnection: Redis | undefined;

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.APPLICATION, provider: { useValue: config.get<IApplication>('application') } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.METER, provider: { useValue: OtelMetrics.getMeterProvider().getMeter(SERVICE_NAME) } },
    { token: schemaSymbol, provider: { useValue: schemas } },
    { token: SCHEMA_ROUTER_SYMBOL, provider: { useFactory: schemaRouterFactory } },

    // { token: REDIS_SYMBOL, provider: { useFactory: instancePerContainerCachingFactory(async (redisConnection)=>{
    //   if (connectToExternal) {
    //     redisConnection = await createConnection(config.get<RedisOptions>('db'));
    // )} } },
    {
      token: REDIS_SYMBOL,
      provider: {
        useValue: {
          useValue: async () => {
            if (connectToExternal) {
              redisConnection = await createConnection(config.get<RedisOptions>('db'));

              redisConnection.on('connect', () => {
                logger.info(`redis client is connected.`);
              });

              redisConnection.on('error', (err: Error) => {
                logger.error({ err: err, msg: 'redis client got an error' });
              });

              redisConnection.on('reconnecting', (delay: number) => {
                logger.info(`redis client reconnecting, next reconnection attemp in ${delay}ms`);
              });
              return redisConnection;
            }
          },
        },
      },
    },

    {
      token: IDOMAIN_FIELDS_REPO_SYMBOL,
      provider: {
        useValue: {
          useClass: async () => {
            if (connectToExternal) {
              redisConnection = await createConnection(config.get<RedisOptions>('db'));

              redisConnection.on('connect', () => {
                logger.info(`redis client is connected.`);
              });

              redisConnection.on('error', (err: Error) => {
                logger.error({ err: err, msg: 'redis client got an error' });
              });

              redisConnection.on('reconnecting', (delay: number) => {
                logger.info(`redis client reconnecting, next reconnection attemp in ${delay}ms`);
              });
              return RedisManager;
            } else {
              return {};
            }
          },
        },
      },
    },
    {
      token: ON_SIGNAL,
      provider: {
        useValue: {
          useValue: async (): Promise<void> => {
            const promises: Promise<void>[] = [tracing.stop()];
            if (connectToExternal && redisConnection !== undefined) {
              redisConnection.disconnect();

              const promisifyQuit = new Promise<void>((resolve) => {
                redisConnection = redisConnection as Redis;
                redisConnection.once('end', () => {
                  resolve();
                });
                void redisConnection.quit();
              });
              promises.push(promisifyQuit);
            }
            await Promise.all(promises);
          },
        },
      },
    },
  ];

  if (connectToExternal) {
    redisConnection = await createConnection(config.get<RedisOptions>('db'));

    redisConnection.on('connect', () => {
      logger.info(`redis client is connected.`);
    });

    redisConnection.on('error', (err: Error) => {
      logger.error({ err: err, msg: 'redis client got an error' });
    });

    redisConnection.on('reconnecting', (delay: number) => {
      logger.info(`redis client reconnecting, next reconnection attemp in ${delay}ms`);
    });
    dependencies.push({ token: REDIS_SYMBOL, provider: { useValue: redisConnection } });
    dependencies.push({ token: IDOMAIN_FIELDS_REPO_SYMBOL, provider: { useClass: RedisManager } });
  } else {
    dependencies.push({ token: IDOMAIN_FIELDS_REPO_SYMBOL, provider: { useValue: {} } });
  }
  dependencies.push({
    token: SERVICES.HEALTHCHECK,
    provider: {
      useValue: {
        useValue: async (): Promise<void> => {
          if (redisConnection === undefined) {
            return Promise.resolve();
          }
          await redisConnection.ping();
        },
      },
    },
  });
  return registerDependencies(dependencies, options?.override, options?.useChild);
};
