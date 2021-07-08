import { container } from 'tsyringe';
import config from 'config';
import { logMethod, Metrics } from '@map-colonies/telemetry';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { SchemaManager } from './schema/models/schemaManager';
import { Schemas } from './schema/models/mapping';
import { Services } from './common/constants';
import { tracing } from './common/tracing';

function registerExternalValues(): void {
  container.register(Services.CONFIG, { useValue: config });

  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  // @ts-expect-error the signature is wrong
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });

  tracing.start();
  const tracer = trace.getTracer('external-to-osm-tag-mapping');
  container.register(Services.TRACER, { useValue: tracer });

  container.register(Services.LOGGER, { useValue: logger });
  container.register<SchemaManager>(SchemaManager, { useClass: SchemaManager });
  container.register<Schemas>(Schemas, { useClass: Schemas });

  const metrics = new Metrics('external-to-osm-tag-mapping');
  const meter = metrics.start();
  container.register(Services.METER, { useValue: meter });

  container.register('onSignal', {
    useValue: async (): Promise<void> => {
      await Promise.all([tracing.stop(), metrics.stop()]);
    },
  });
}

export { registerExternalValues };
