/* eslint-disable @typescript-eslint/naming-convention */
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { Schema } from '../../../src/schema/models/types';
import { Tags } from '../../../src/schema/providers/fileProvider/fileProvider';

import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

describe('schemas', function () {
  beforeAll(async function () {
    await registerTestValues();
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
        });
      });
    });

    describe('GET /schema', function () {
      it('should return 200 status code with a single schema', async function () {
        const response = await requestSender.getSchema('system1');
        expect(response.status).toBe(httpStatusCodes.OK);

        const schema = response.body as Schema;
        expect(schema).toBeDefined();
        expect(schema).toHaveProperty('name', 'system1');
      });

      it('should return 200 status code and map the tags', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
            externalKey4: 'val4',
          },
        };
        const expected = {
          properties: {
            system1_externalKey1: 'val1',
            system1_externalKey2: 'val2',
            system1_externalKey3: 'val3',
            system1_externalKey4: 'val4',
          },
        };
        const response = await requestSender.map('system1', tags);
        expect(response.status).toBe(httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    describe('GET /schemas/:name', function () {
      it('should return 404 status code for non-existent schema', async function () {
        const response = await requestSender.getSchema('system3');

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);

        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'system system3 not found' });
      });
    });
    describe('POST /schemas/:name/map', function () {
      it('should return 404 status code for non-existent schema', async function () {
        const geoJson = { type: 'Feature', properties: { key1: 'val2', externalKey2: 'val3', externalKey1: 'val1', key2: 'val4', geometry: '' } };

        const response = await requestSender.map('system3', geoJson);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'system system3 not found' });
      });
    });
  });
});
