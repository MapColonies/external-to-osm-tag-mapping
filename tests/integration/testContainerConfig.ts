import { container } from 'tsyringe';
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { getSchemas } from '../../src/schema/providers/schemaLoader';
import { Services } from '../../src/common/constants';
import { schemaSymbol } from '../../src/schema/models/types';

async function registerTestValues(): Promise<void> {
  container.register(Services.CONFIG, { useValue: config });
  container.register(Services.LOGGER, { useValue: jsLogger({ enabled: false }) });
  const schemas = await getSchemas(container);
  container.register(schemaSymbol, { useValue: schemas });
}

export { registerTestValues };
