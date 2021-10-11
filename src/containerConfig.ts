import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { logMethod, Metrics } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import { ON_SIGNAL, REDIS_CONNECTION_ERROR_CODE, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import config from 'config';
import { Redis, RedisOptions } from 'ioredis';
import { container } from 'tsyringe';
import { createConnection } from './common/db';
import { tracing } from './common/tracing';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { schemaSymbol } from './schema/models/types';
import { getSchemas } from './schema/providers/schemaLoader';

async function registerExternalValues(): Promise<void> {
  container.register(SERVICES.CONFIG, { useValue: config });

  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error the signature is wrong
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });

  tracing.start();
  const tracer = trace.getTracer(SERVICE_NAME);
  container.register(SERVICES.TRACER, { useValue: tracer });
  container.register(SERVICES.LOGGER, { useValue: logger });
  const redisConnection = await createConnection(config.get<RedisOptions>('db.connection.options'));
  redisConnection.on('error', (err) => {
    logger.fatal(err, `Redis connection failure, exiting with code ${REDIS_CONNECTION_ERROR_CODE}`);
    return process.exit(REDIS_CONNECTION_ERROR_CODE);
  });

  container.register(REDIS_SYMBOL, { useValue: redisConnection });
  container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });

  const schemas = await getSchemas(container);
  container.register(schemaSymbol, { useValue: schemas });

  const connectToExternal = schemas.some((schema) => {
    return schema.enableExternalFetch === 'yes';
  });

  let redisConnection: Redis;

  if (connectToExternal) {
    redisConnection = createConnection(config.get<RedisOptions>('db'));
    container.register(REDIS_SYMBOL, { useValue: redisConnection });
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
  } else {
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useValue: {} });
  }

  const metrics = new Metrics(SERVICE_NAME);
  const meter = metrics.start();
  container.register(SERVICES.METER, { useValue: meter });

  container.register(ON_SIGNAL, {
    useValue: async (): Promise<void> => {
      await Promise.all([tracing.stop(), metrics.stop(), connectToExternal ? redisConnection.disconnect() : undefined]);
    },
  });

  container.register(SERVICES.HEALTHCHECK, {
    useValue: async (): Promise<void> => {
      await redisConnection.ping();
    },
  });
}

export { registerExternalValues };
