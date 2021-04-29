import { container } from 'tsyringe';
import config from 'config';
import { logMethod, Tracing, Metrics } from '@map-colonies/telemetry';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { SchemaManager } from './schema/models/schemaManager';
import { Schemas } from './schema/models/mapping';
import { Services } from './common/constants';

function registerExternalValues(tracing: Tracing): void {
  const loggerConfig = config.get<LoggerOptions>('logger');
  // @ts-expect-error the signature is wrong
  const logger = jsLogger({ ...loggerConfig, prettyPrint: false, hooks: { logMethod } });

  container.register(Services.CONFIG, { useValue: config });
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
