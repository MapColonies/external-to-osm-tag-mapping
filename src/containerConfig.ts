import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { logMethod, Metrics } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import config from 'config';
import { Redis, RedisOptions } from 'ioredis';
import { container, FactoryFunction } from 'tsyringe';
import { DEFAULT_EXIT_CODE, ON_SIGNAL, REDIS_SYMBOL, SERVICES, SERVICE_NAME } from './common/constants';
import { createConnection } from './common/db';
import { IApplication } from './common/interfaces';
import { tracing } from './common/tracing';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';
import { schemaSymbol } from './schema/models/types';
import { getSchemas } from './schema/providers/schemaLoader';

async function registerExternalValues(): Promise<void> {
  // catch unhandled rejections and stop the service
  process.on('unhandledRejection', (reason) => {
    logger.fatal(reason ?? {}, `Unhandled rejection, exiting with code ${DEFAULT_EXIT_CODE}`);
    return process.exit(DEFAULT_EXIT_CODE);
  });

  container.register(SERVICES.CONFIG, { useValue: config });
  if (config.has('app')) {
    container.register(SERVICES.APPLICATION, { useValue: config.get<IApplication>('app') });
  } else {
    const factory: FactoryFunction<undefined> = () => {
      return undefined;
    };
    container.register(SERVICES.APPLICATION, { useFactory: factory });
  }

  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error the signature is wrong
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });

  tracing.start();
  const tracer = trace.getTracer(SERVICE_NAME);
  container.register(SERVICES.TRACER, { useValue: tracer });
  container.register(SERVICES.LOGGER, { useValue: logger });

  const schemas = await getSchemas(container);
  container.register(schemaSymbol, { useValue: schemas });

  const connectToExternal = schemas.some((schema) => {
    return schema.enableExternalFetch === 'yes';
  });

  let redisConnection: Redis;

  if (connectToExternal) {
    redisConnection = await createConnection(config.get<RedisOptions>('db'));

    //handle redis connectivity errors
    redisConnection.on('error', (err) => {
      //don't throw errors here, allow them to be thrown when redis commands are sent
      logger.fatal(err, 'Redis connection failed');
    });

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
      await Promise.all([tracing.stop(), metrics.stop(), connectToExternal ? redisConnection.disconnect() : Promise.resolve()]);
    },
  });

  container.register(SERVICES.HEALTHCHECK, {
    useValue: async (): Promise<void> => {
      await redisConnection.ping();
    },
  });
}

export { registerExternalValues };
