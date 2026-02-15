import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { ConfigType } from '@src/common/config';
import { SERVICES } from '../../common/constants';
import { Constructor } from '../../common/interfaces';
import { FileSchemaProvider } from './fileProvider/fileProvider';
import { ISchemaProvider } from './provider';

const schemaProviders: Record<string, SchemaProviderConstructor> = {
  file: FileSchemaProvider,
};

export type SchemaProviderConstructor = Constructor<ISchemaProvider> | undefined;

export const SCHEMA_PROVIDER_SYMBOL = Symbol('schemaProviderFactory');

export const schemaProviderFactory: FactoryFunction<SchemaProviderConstructor> = (container: DependencyContainer) => {
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);

  const providerKey = config.get('schema.provider');
  if (providerKey == null) {
    throw new Error('no schemas found');
  }
  const provider = schemaProviders[providerKey];

  return provider;
};
