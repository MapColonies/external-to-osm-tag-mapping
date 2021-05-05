import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { IConfig } from '../../common/interfaces';
export type Tags = Record<string, unknown>;

export interface Schema {
  name: string;
  createdAt: string;
  updatedAt: string;
  mapping: Record<string, string>;
}

export interface ISchemas {
  getSchemas: () => Promise<Schema[]>;
  getSchema: (name: string) => Promise<Schema | undefined>;
}

@injectable()
export class Schemas implements ISchemas {
  public constructor(@inject(Services.CONFIG) private readonly config: IConfig) {}
  public async getSchemas(): Promise<Schema[]> {
    return Promise.resolve([
      {
        name: this.config.get('schema.name'),
        createdAt: '2020-12-20T13:32:25Z',
        updatedAt: '2020-12-20T13:32:25Z',
        mapping: {},
      },
    ]); //get all schemas from db
  }

  public async getSchema(name: string): Promise<Schema | undefined> {
    const schemas = await this.getSchemas();
    return schemas.find((schema) => schema.name === name);
  }
}
