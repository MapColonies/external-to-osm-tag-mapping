import * as supertest from 'supertest';
import { Application } from 'express';

import { container } from 'tsyringe';
import { ServerBuilder } from '../../../../src/serverBuilder';
import { Tags } from '../../../../src/schema/models/types';
import { convertObjectToSnakeCase } from '../../../../src/common/utils';

let app: Application | null = null;

export function init(): void {
  const builder = container.resolve<ServerBuilder>(ServerBuilder);
  app = builder.build();
}

export async function getSchemas(): Promise<supertest.Response> {
  return supertest.agent(app).get('/schemas');
}

export async function getSchema(name: string): Promise<supertest.Response> {
  return supertest.agent(app).get(`/schemas/${name}`);
}

export async function map(name: string, body: { properties: Tags }, queryParams?: Record<string, unknown>): Promise<supertest.Response> {
  let req = supertest.agent(app).post(`/schemas/${name}/map`).send(body);

  if (queryParams) {
    const snakeCasedQueryParams = convertObjectToSnakeCase(queryParams);
    req = req.query(snakeCasedQueryParams);
  }

  return req;
}
