import _ from 'lodash';
import { inject, injectable } from 'tsyringe';
import { Tags } from '../providers/fileProvider/fileProvider';
import { Schema, schemaSymbol } from './types';

@injectable()
export class SchemaManager {
  private readonly keyIgnoreSets: Record<string, Set<string>> = {};
  public constructor(@inject(schemaSymbol) private readonly schemas: Schema[]) {
    schemas.forEach((schema) => {
      this.keyIgnoreSets[schema.name] = new Set(schema.ignoreKeys);
    });
  }

  public getSchemas(): Schema[] {
    return this.schemas;
  }

  public getSchema(name: string): Schema | undefined {
    return this.schemas.find((schema) => schema.name === name);
  }

  public map(name: string, tags: Tags): Tags {
    return Object.entries(tags).reduce((acc, [key, value]) => {
      if (this.keyIgnoreSets[name].has(key)) {
        return acc;
      }
      return { ...acc, [`${name}_${key}`]: value };
    }, {});
  }
}
