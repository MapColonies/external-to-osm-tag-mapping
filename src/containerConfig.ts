import { container } from 'tsyringe';
import config from 'config';
import { logMethod, Metrics } from '@map-colonies/telemetry';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { RedisOptions } from 'ioredis';
import { REDIS_SYMBOL, Services } from './common/constants';
import { tracing } from './common/tracing';
import { schemaSymbol } from './schema/models/types';
import { getSchemas } from './schema/providers/schemaLoader';
import { createConnection } from './common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from './schema/DAL/domainFieldsRepository';
import { RedisManager } from './schema/DAL/redisManager';

async function registerExternalValues(): Promise<void> {
  container.register(Services.CONFIG, { useValue: config });

  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error the signature is wrong
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });

  tracing.start();
  const tracer = trace.getTracer('external-to-osm-tag-mapping');
  container.register(Services.TRACER, { useValue: tracer });
  container.register(Services.LOGGER, { useValue: logger });

  const redisConnection = createConnection(config.get<RedisOptions>('db'));
  container.register(REDIS_SYMBOL, { useValue: redisConnection });
  container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });

  const schemas = await getSchemas(container);
  container.register(schemaSymbol, { useValue: schemas });

  const metrics = new Metrics('external-to-osm-tag-mapping');
  const meter = metrics.start();
  container.register(Services.METER, { useValue: meter });

  container.register('onSignal', {
    useValue: async (): Promise<void> => {
      await Promise.all([tracing.stop(), metrics.stop(), redisConnection.disconnect()]);
    },
  });
}

export { registerExternalValues };
