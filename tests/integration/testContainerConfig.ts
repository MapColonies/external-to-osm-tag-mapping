import { container, FactoryFunction } from 'tsyringe';
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { Redis, RedisOptions } from 'ioredis';
import { getSchemas } from '../../src/schema/providers/schemaLoader';
import { DOMAIN_PREFIX, EXPLODE_PREFIX, REDIS_SYMBOL, SERVICES } from '../../src/common/constants';
import { schemaSymbol } from '../../src/schema/models/types';
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

  const redisConnection: Redis = await createConnection(config.get<RedisOptions>('db'));

  container.register(schemaSymbol, { useValue: schemas });
  container.register(REDIS_SYMBOL, { useValue: redisConnection });
  container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
  container.register(EXPLODE_PREFIX, { useValue: config.get<string>('application.keys.explodePrefix') });
  container.register(DOMAIN_PREFIX, { useValue: config.get<string>('application.keys.domainPrefix') });
}

export { registerTestValues };
