import { readFileSync } from 'fs';
import { container } from 'tsyringe';
import config from 'config';
import { Probe } from '@map-colonies/mc-probe';
import { MCLogger, ILoggerConfig, IServiceConfig } from '@map-colonies/mc-logger';
import { SchemaManager } from './schema/models/schemaManager';
import { Schemas } from './schema/models/mapping';
import { Services } from './common/constants';

function registerExternalValues(): void {
  const loggerConfig = config.get<ILoggerConfig>('logger');
  const packageContent = readFileSync('./package.json', 'utf8');
  const service = JSON.parse(packageContent) as IServiceConfig;
  const logger = new MCLogger(loggerConfig, service);

  container.register(Services.CONFIG, { useValue: config });
  container.register(Services.LOGGER, { useValue: logger });
  container.register<Probe>(Probe, { useValue: new Probe(logger, {}) });
  container.register<SchemaManager>(SchemaManager, { useClass: SchemaManager });
  container.register<Schemas>(Schemas, { useClass: Schemas });
}

export { registerExternalValues };
