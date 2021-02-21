/* eslint-disable @typescript-eslint/naming-convention */
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { Schema } from '../../../src/schema/models/mapping';

import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

describe('schemas', function () {
  beforeAll(function () {
    registerTestValues();
    requestSender.init();
  });
  afterEach(function () {
    container.clearInstances();
  });

  describe('Happy Path', function () {
    describe('GET /schemas', function () {
      it('should return 200 status code with schemas array', async function () {
        const response = await requestSender.getSchemas();
        expect(response.status).toBe(httpStatusCodes.OK);

        const schemas = response.body as Schema[];
        expect(schemas).toBeInstanceOf(Array);

        schemas.forEach((elm) => {
          expect(elm).toHaveProperty('name');
          expect(elm).toHaveProperty('createdAt');
          expect(elm).toHaveProperty('updatedAt');
          expect(elm).toHaveProperty('mapping');
          expect(elm.mapping).toBeInstanceOf(Object);
        });
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
  });
  describe('Sad Path', function () {
    describe('GET /schemas/:name', function () {
      it('should return 404 status code for non-existent schema', async function () {
        const response = await requestSender.getSchema('system1');

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);

        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'system system1 not found' });
      });
    });
    describe('POST /schemas/:name/map', function () {
      it('should return 404 status code for non-existent schema', async function () {
        const geoJson = { type: 'Feature', properties: { key1: 'val2', externalKey2: 'val3', externalKey1: 'val1', key2: 'val4', geometry: '' } };

        const response = await requestSender.map('system1', geoJson);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'system system1 not found' });
      });
    });
  });
});
