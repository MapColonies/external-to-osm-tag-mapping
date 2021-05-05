import _ from 'lodash';
import { inject, injectable } from 'tsyringe';
import { Schemas, Schema, Tags, ISchemas } from './mapping';

@injectable()
export class SchemaManager {
  public constructor(@inject(Schemas) private readonly schemas: ISchemas) {}

  public async getSchemas(): Promise<Schema[]> {
    return this.schemas.getSchemas();
  }

  public async getSchema(name: string): Promise<Schema | undefined> {
    return this.schemas.getSchema(name);
  }

  public async map(name: string, tags: Tags): Promise<Tags> {
    return Promise.resolve(
      _.mapKeys(tags, (val, key) => {
        return `${name}_${key}`;
      })
    );
  }
}
