import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { logMethod } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import config from 'config';
import { Redis, RedisOptions } from 'ioredis';
import { container } from 'tsyringe';
import { ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import { createConnection } from './common/db';
import { IApplication } from './common/interfaces';
import { tracing } from './common/tracing';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { schemaSymbol } from './schema/models/types';
import { getSchemas } from './schema/providers/schemaLoader';

async function registerExternalValues(): Promise<void> {
  container.register(SERVICES.CONFIG, { useValue: config });
  container.register(SERVICES.APPLICATION, { useValue: config.get<IApplication>('application') });
  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error the signature is wrong
  const logger = jsLogger({ ...loggerConfig, hooks: { logMethod } });
  container.register(SERVICES.LOGGER, { useValue: logger });

  tracing.start();
  const tracer = trace.getTracer(SERVICE_NAME);
  container.register(SERVICES.TRACER, { useValue: tracer });

  const schemas = await getSchemas(container);
  container.register(schemaSymbol, { useValue: schemas });

  const connectToExternal = schemas.some((schema) => {
    return schema.enableExternalFetch === 'yes';
  });

  let redisConnection: Redis | undefined;

  container.register(ON_SIGNAL, {
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
  });

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

    container.register(REDIS_SYMBOL, { useValue: redisConnection });
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
  } else {
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useValue: {} });
  }

  container.register(SERVICES.HEALTHCHECK, {
    useValue: async (): Promise<void> => {
      if (redisConnection === undefined) {
        return Promise.resolve();
      }
      await redisConnection.ping();
    },
  });
}

export { registerExternalValues };
