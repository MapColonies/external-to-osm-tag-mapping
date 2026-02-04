import { container } from 'tsyringe';
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { RedisOptions } from 'ioredis';
import { Registry } from 'prom-client';
import { getSchemas } from '../../src/schema/providers/schemaLoader';
import { REDIS_SYMBOL, SERVICES } from '../../src/common/constants';
import { schemaSymbol } from '../../src/schema/models/types';
import { createConnection } from '../../src/common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../src/schema/DAL/domainFieldsRepository';
import { RedisManager } from '../../src/schema/DAL/redisManager';
import { IApplication } from '../../src/common/interfaces';

export const registerTestValues = async (params?: { appConfig?: IApplication; redisOptions?: RedisOptions }): Promise<void> => {
  const { appConfig, redisOptions = {} } = params ?? {};

  container.register(SERVICES.CONFIG, { useValue: config });
  container.register(SERVICES.LOGGER, { useValue: jsLogger({ enabled: false }) });

  container.register(SERVICES.METRICS, {
    useValue: new Registry(),
  });

  if (appConfig) {
    container.register(SERVICES.APPLICATION, {
      useFactory: () => appConfig,
    });
  } else {
    container.register(SERVICES.APPLICATION, {
      useValue: config.get<IApplication>('application'),
    });
  }

  const schemas = await getSchemas(container);
  const redisConnection = await createConnection({
    ...config.get<RedisOptions>('db'),
    ...redisOptions,
  });

  container.register(schemaSymbol, { useValue: schemas });
  container.register(REDIS_SYMBOL, { useValue: redisConnection });
  container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
};
