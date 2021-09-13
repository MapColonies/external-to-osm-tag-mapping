import { Schema } from 'ajv';
import { DependencyContainer } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { IConfig, Constructor } from '../../common/interfaces';
import { FileSchemaProvider } from './fileProvider/fileProvider';
import { ISchemaProvider } from './provider';

const schemaProviders: Record<string, Constructor<ISchemaProvider> | undefined> = {
  file: FileSchemaProvider,
};

export const getSchemas = async (container: DependencyContainer): Promise<Schema[]> => {
  const config = container.resolve<IConfig>(SERVICES.CONFIG);
  const providerKey = config.get<string>('schema.provider');
  const provider = schemaProviders[providerKey];
  if (provider) {
    return container.resolve(provider).loadSchemas();
  } else {
    throw new Error('no schemas found');
  }
};
