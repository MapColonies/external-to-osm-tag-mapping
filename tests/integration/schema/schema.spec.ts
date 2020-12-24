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
    describe('/schemas', function () {
      it('should return 200 status code and empty schemas', async function () {
        const response = await requestSender.getSchemas();

        expect(response.status).toBe(httpStatusCodes.OK);

        const schemas = response.body as Schema;
        expect(schemas).toEqual([]);
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
  });
  describe('Sad Path', function () {
    describe('/schemas/:name', function () {
      it('should return 404 status code and not found', async function () {
        const response = await requestSender.getSchema('system1');

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);

        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'system system1 not found' });
      });
    });

    describe('/schemas/:name/map', function () {
      it('should return 404 status code and not found', async function () {
        const response = await requestSender.getSchema('system1');

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);

        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'system system1 not found' });
      });
    });
  });
});
