import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { logMethod, Metrics } from '@map-colonies/telemetry';
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

  const metrics = new Metrics(SERVICE_NAME);
  const meter = metrics.start();
  container.register(SERVICES.METER, { useValue: meter });

  let redisConnection: Redis;

  container.register(ON_SIGNAL, {
    useValue: async (): Promise<void> => {
      if (redisConnection !== undefined) {
        redisConnection.disconnect();
      }

      const promisifyQuit = new Promise<void>((resolve, reject) => {
        redisConnection.once('end', () => {
          resolve()
        })
        redisConnection.quit();
      })

      await Promise.all([metrics.stop, tracing.stop, (connectToExternal && redisConnection) ? promisifyQuit : Promise.resolve()]);
    },
  });

  if (connectToExternal) {
    redisConnection = await createConnection(config.get<RedisOptions>('db'));

    redisConnection.on('connect', () => {
      logger.info(`redis client is connected.`);
    });

    redisConnection.on('error', (err) => {
      logger.error(`redis client got the following error: ${err}`);
    });

    redisConnection.on('reconnecting', (delay) => {
      logger.info(`redis client next reconnection attemp in ${delay}ms`);
    });

    container.register(REDIS_SYMBOL, { useValue: redisConnection });
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
  } else {
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useValue: {} });
  }

  container.register(SERVICES.HEALTHCHECK, {
    useValue: async (): Promise<void> => {
      await redisConnection.ping();
    },
  });
}

export { registerExternalValues };
