import * as supertest from 'supertest';
import { Tags } from '../../../../src/common/types';

export class SchemaRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getSchemas(): Promise<supertest.Response> {
    return supertest.agent(this.app).get('/schemas');
  }

  public async getSchema(name: string): Promise<supertest.Response> {
    return supertest.agent(this.app).get(`/schemas/${name}`);
  }

  public async map(name: string, body: { properties: Tags }): Promise<supertest.Response> {
    return supertest.agent(this.app).post(`/schemas/${name}/map`).send(body);
  }
}
