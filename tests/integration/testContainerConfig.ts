import { container } from 'tsyringe';
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { RedisOptions } from 'ioredis';
import { getSchemas } from '../../src/schema/providers/schemaLoader';
import { REDIS_SYMBOL, SERVICES } from '../../src/common/constants';
import { schemaSymbol } from '../../src/schema/models/types';
import { createConnection } from '../../src/common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../src/schema/DAL/domainFieldsRepository';
import { RedisManager } from '../../src/schema/DAL/redisManager';

async function registerTestValues(): Promise<void> {
  container.register(SERVICES.CONFIG, { useValue: config });
  container.register(SERVICES.LOGGER, { useValue: jsLogger({ enabled: false }) });

  const schemas = await getSchemas(container);
  const redisConnection = createConnection(config.get<RedisOptions>('db'));

  container.register(schemaSymbol, { useValue: schemas });
  container.register(REDIS_SYMBOL, { useValue: redisConnection });
  container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
}

export { registerTestValues };
