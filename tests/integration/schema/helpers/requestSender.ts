import * as supertest from 'supertest';
import { Application } from 'express';

import { container } from 'tsyringe';
import { ServerBuilder } from '../../../../src/serverBuilder';
import { Tags } from '../../../../src/common/types';

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

export async function map(name: string, body: { properties: Tags }): Promise<supertest.Response> {
  return supertest.agent(app).post(`/schemas/${name}/map`).send(body);
}
