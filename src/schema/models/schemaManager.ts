import _ from 'lodash';
import { inject, injectable } from 'tsyringe';
import { Tags } from '../providers/fileProvider/fileProvider';
import { Schema, schemaSymbol } from './types';

@injectable()
export class SchemaManager {
  public constructor(@inject(schemaSymbol) private readonly schemas: Schema[]) {}

  public getSchemas(): Schema[] {
    return this.schemas;
  }

  public getSchema(name: string): Schema | undefined {
    return this.schemas.find((schema) => schema.name === name);
  }

  public map(name: string, tags: Tags): Tags {
    return _.mapKeys(tags, (val, key) => {
      return `${name}_${key}`;
    });
  }
}
