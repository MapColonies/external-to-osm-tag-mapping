import { injectable } from 'tsyringe';

export type Tags = Record<string, unknown>;

export interface Schema {
  name: string;
  createdAt: string;
  updatedAt: string;
  mapping: Record<string, string>;
}

@injectable()
export class Schemas {
  public async getSchemas(): Promise<Schema[]> {
    return Promise.resolve([
      {
        name: 'avi',
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
