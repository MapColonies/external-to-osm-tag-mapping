import { container } from 'tsyringe';
import jsLogger from '@map-colonies/js-logger';
import { RedisOptions } from 'ioredis';
import { Registry } from 'prom-client';
import { getConfig, initConfig } from '@src/common/config';
import { getRedisConfig } from '@src/schema/utils/redisConfig';
import { getSchemas } from '../../src/schema/providers/schemaLoader';
import { REDIS_SYMBOL, SERVICES } from '../../src/common/constants';
import { createConnection } from '../../src/common/db';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../src/schema/DAL/domainFieldsRepository';
import { RedisManager } from '../../src/schema/DAL/redisManager';
import { IApplication } from '../../src/common/interfaces';

export const registerTestValues = async (params?: { appConfig?: IApplication; redisOptions?: RedisOptions }): Promise<void> => {
  const { appConfig } = params ?? {};
  await initConfig(true);
  const config = getConfig();
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
      useValue: config.get('application'),
    });
  }

  const schemas = await getSchemas(container);

  const redisConnection = await createConnection(getRedisConfig());

  container.register(SERVICES.SCHEMAS, { useValue: schemas });
  container.register(REDIS_SYMBOL, { useValue: redisConnection });
  container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useClass: RedisManager });
};
