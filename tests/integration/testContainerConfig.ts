import { container, FactoryFunction } from 'tsyringe';
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import Redis from 'ioredis';
import { RedisOptions } from 'ioredis';
import { getSchemas } from '../../src/schema/providers/schemaLoader';
import { REDIS_SYMBOL, SCHEMAS_SYMBOL, SERVICES } from '../../src/common/constants';
import { createConnection } from '../../src/common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../src/schema/DAL/domainFieldsRepository';
import { RedisManager } from '../../src/schema/DAL/redisManager';
import { IApplication } from '../../src/common/interfaces';

async function registerTestValues(appConfig?: IApplication): Promise<void> {
  container.register(SERVICES.CONFIG, { useValue: config });
  container.register(SERVICES.LOGGER, { useValue: jsLogger({ enabled: false }) });

  if (appConfig) {
    const factory: FactoryFunction<object | undefined> = () => {
      return appConfig;
    };
    container.register(SERVICES.APPLICATION, { useFactory: factory });
  } else {
    container.register(SERVICES.APPLICATION, { useValue: config.get<IApplication>('application') });
  }

  const schemas = await getSchemas(container);
  container.register(SCHEMAS_SYMBOL, { useValue: schemas });

  const redisConnection: Redis = await createConnection(config.get<RedisOptions>('db'));
  container.register(REDIS_SYMBOL, { useValue: redisConnection });
  container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
}

export { registerTestValues };
