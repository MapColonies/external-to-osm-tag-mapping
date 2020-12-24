import _ from 'lodash';
import { inject, injectable } from 'tsyringe';
import { Schemas, Schema, Tags } from './mapping';

@injectable()
export class SchemaManager {
  public constructor(@inject(Schemas) private readonly schemas: Schemas) {}

  public async getSchemas(): Promise<Schema[]> {
    return this.schemas.getSchemas();
  }

  public async getSchema(name: string): Promise<Schema | undefined> {
    return this.schemas.getSchema(name);
  }

  public async map(name: string, tags: Tags): Promise<Tags> {
    const schema: Schema | undefined = await this.getSchema(name);
    let tagsCopy = { ...tags };

    if (schema) {
      tagsCopy = this.mapTags(tags, schema);
    }
    return this.addSystemName(tagsCopy, name);
  }

  private addSystemName(tags: Tags, name: string): Tags {
    return _.mapKeys(tags, (val, key) => {
      return `${name}_${key}`;
    });
  }

  private mapTags(tags: Tags, schema: Schema): Tags {
    const mapKeysArr = Object.keys(schema.mapping);
    const tagsAfterMapping = _.mapKeys(tags, (value, key) => {
      const tagIndex = mapKeysArr.find((mapKey) => mapKey === key);
      if (tagIndex === undefined) {
        return key;
      }
      return schema.mapping[tagIndex];
    });

    return tagsAfterMapping;
  }
}
