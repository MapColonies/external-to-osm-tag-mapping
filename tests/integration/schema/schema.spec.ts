/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import config from 'config';
import httpStatusCodes from 'http-status-codes';
import Redis, { RedisOptions } from 'ioredis';
import { FactoryFunction, container, instancePerContainerCachingFactory } from 'tsyringe';
import { getApp } from '../../../src/app';
import { SERVICES, REDIS_SYMBOL } from '../../../src/common/constants';
import { IApplication } from '../../../src/common/interfaces';
import { Tags } from '../../../src/common/types';
import { Schema } from '../../../src/schema/models/types';
import { getSchemas } from '../../../src/schema/providers/schemaLoader';
import { createConnection } from '../../../src/common/db';
import { schemaSymbol } from '../../../src/schema/models/types';
import { registerTestValues } from '../testContainerConfig';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../../src/schema/DAL/domainFieldsRepository';
import { RedisManager } from '../../../src/schema/DAL/redisManager';
import { SchemaRequestSender } from './helpers/requestSender';
// import * as requestSender from './helpers/requestSender';

interface TagMappingTestValues {
  testCaseName: string;
  name: string;
  tagProperties: Tags;
  expectedProperties: Record<string, string>;
  key: string;
  value: string;
}

describe('schemas', function () {
  let requestSender: SchemaRequestSender;
  const applicationConfigs: Record<string, IApplication>[] = [
    { application: { hashKey: { enabled: false } } },
    { application: { hashKey: { enabled: true, value: 'hashKey1' } } },
  ];

  const hashKey = applicationConfigs[1]?.application?.hashKey?.value ?? 'hashKey1';

  let redisConnection: Redis;
  // beforeAll(async function () {
  //   await registerTestValues();
  //   // requestSender.init();
  //   redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
  // });
  // afterAll(async function () {
  //   if (!['end'].includes(redisConnection.status)) {
  //     await redisConnection.quit();
  //   }
  // });

  beforeEach(async function () {
    await registerTestValues();
    // container.register(SERVICES.CONFIG, { useValue: config });
    // container.register(SERVICES.LOGGER, { useValue: jsLogger({ enabled: false }) });
    const schemas = await getSchemas(container);
    redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
    // redisConnection = await createConnection(config.get<RedisOptions>('db'));

    const app = await getApp({
      override: [
        // { token: SERVICES.CONFIG, provider: { useValue: config } },
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },

        { token: schemaSymbol, provider: { useValue: schemas } },
        { token: REDIS_SYMBOL, provider: { useValue: redisConnection } },
        { token: IDOMAIN_FIELDS_REPO_SYMBOL, provider: { useClass: RedisManager } },
      ],
      useChild: true,
    });
    requestSender = new SchemaRequestSender(app);
    await redisConnection.flushall();
  });
  afterAll(async function () {
    if (!['end'].includes(redisConnection.status)) {
      await redisConnection.quit();
    }
  });

  describe('Happy Path', function () {
    describe('GET /schemas', function () {
      it('should return 200 status code with schemas array', async function () {
        const response = await requestSender.getSchemas();
        expect(response).toHaveProperty('status', httpStatusCodes.OK);

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
        expect(response).toHaveProperty('status', httpStatusCodes.OK);

        const schema = response.body as Schema;
        expect(schema).toBeDefined();
        expect(schema).toHaveProperty('name', 'system1');
      });
    });

    describe('POST /schemas/:name/map', () => {
      it('should return 200 status code and map the tags when the requested keys are not in the domain', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
          },
        };
        const expected = {
          properties: {
            system3_externalKey1: 'val1',
            system3_externalKey2: 'val2',
            system3_externalKey3: 'val3',
          },
        };
        const response = await requestSender.map('system3', tags);
        expect(response).toHaveProperty('status', httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });

      it('should return 200 status code and map the tags when the requested keys are not in the domain with renamed key', async function () {
        const tags = {
          properties: {
            externalKey2: 'val2',
            externalKey1: 'val1',
          },
        };
        const expected = {
          properties: {
            system1_renamedExternalKey1: 'val1',
            system1_externalKey2: 'val2',
          },
        };

        const response = await requestSender.map('system1', tags);
        expect(response).toHaveProperty('status', httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });

      it('should return 200 status code and map the tags with renamed keys', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
          },
        };
        const expected = {
          properties: {
            system1_renamedExternalKey1: 'val1',
            system1_externalKey2: 'val2',
            system1_externalKey3: 'val3',
          },
        };

        const response = await requestSender.map('system1', tags);
        expect(response).toHaveProperty('status', httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });

      it('should return 200 status code and map the tags without prefixing system name', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
          },
        };
        const expected = {
          properties: {
            externalKey1: 'val1',
            externalKey2: 'val2',
            externalKey3: 'val3',
          },
        };
        const response = await requestSender.map('system4', tags);
        expect(response).toHaveProperty('status', httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });

      it('should return 200 status code and map the tags without the ignored key', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
            key1: 'val4',
          },
        };
        const expected = {
          properties: {
            system2_externalKey1: 'val1',
            system2_externalKey2: 'val2',
            system2_externalKey3: 'val3',
          },
        };

        const response = await requestSender.map('system2', tags);
        expect(response).toHaveProperty('status', httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });

      describe('domain & explode fields', () => {
        const testValues: TagMappingTestValues[] = [
          {
            testCaseName: 'with domain fields',
            name: 'system2',
            tagProperties: { externalKey3: 'val3', externalKey2: 'val2', externalKey1: 'val1', key1: 'val4' },
            expectedProperties: {
              system2_externalKey1: 'val1',
              system2_externalKey2: 'val2',
              system2_externalKey3: 'val3',
              system2_EXTERNALKEY2_DOMAIN: '2',
            },
            key: 'att:EXTERNALKEY2:val2',
            value: '2',
          },
          {
            testCaseName: 'with explode fields',
            name: 'system2',
            tagProperties: { externalKey3: 'val3', externalKey2: 'val2', externalKey1: 'val1', explode1: 'val4' },
            expectedProperties: {
              system2_externalKey1: 'val1',
              system2_externalKey2: 'val2',
              system2_externalKey3: 'val3',
              system2_explode1: 'val4',
              system2_exploded1_DOMAIN: '2',
              system2_exploded2_DOMAIN: '3',
            },
            key: 'explode1:val4',
            value: '{ "exploded1": 2, "exploded2": 3 }',
          },
          {
            testCaseName: 'when a renamed key is also a domain key',
            name: 'system1',
            tagProperties: { externalKey3: 'val3', externalKey2: 'val2', externalKey1: 'val1' },
            expectedProperties: {
              system1_renamedExternalKey1: 'val1',
              system1_RENAMEDEXTERNALKEY1_DOMAIN: '1',
              system1_externalKey2: 'val2',
              system1_externalKey3: 'val3',
            },
            key: 'att:RENAMEDEXTERNALKEY1:val1',
            value: '1',
          },
          {
            testCaseName: 'when the renamed key is also an explode key',
            name: 'system1',
            tagProperties: { externalKey3: 'val3', externalKey2: 'val2', externalKeyRename: 'val1' },
            expectedProperties: {
              system1_explode2: 'val1',
              system1_exploded1_DOMAIN: '2',
              system1_exploded2_DOMAIN: '3',
              system1_externalKey2: 'val2',
              system1_externalKey3: 'val3',
            },
            key: 'explode2:val1',
            value: '{ "exploded1": 2, "exploded2": 3 }',
          },
          {
            testCaseName: 'with domain fields with values containing non-ascii characters',
            name: 'system2',
            tagProperties: { externalKey3: 'שלום שלום/מנכ"ל' },
            expectedProperties: {
              system2_externalKey3: 'שלום שלום/מנכ"ל',
              system2_EXTERNALKEY3_DOMAIN: '2',
            },
            key: 'att:EXTERNALKEY3:שלום שלום/מנכ"ל',
            value: '2',
          },
          {
            testCaseName: 'with explode fields with values containing non-ascii characters',
            name: 'system2',
            tagProperties: { explode2: 'שלום שלום/מנכ"ל' },
            expectedProperties: {
              system2_explode2: 'שלום שלום/מנכ"ל',
              system2_exploded1_heb_DOMAIN: '2',
              system2_exploded2_heb_DOMAIN: '3',
            },
            key: 'explode2:שלום שלום/מנכ"ל',
            value: '{ "exploded1_heb": 2, "exploded2_heb": 3 }',
          },
        ];
        describe('hash key is used by Redis', () => {
          beforeAll(async function () {
            await redisConnection.quit();
            container.clearInstances();
            await registerTestValues(applicationConfigs[1]?.application);
            // requestSender.init();
            const app = getApp({
              override: [
                // { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
                { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
                // { token: IDOMAIN_FIELDS_REPO_SYMBOL, provider: { useClass: RedisManager } },
                // { token: SERVICES.APPLICATION, provider: {useValue: container.resolve(SERVICES.APPLICATION)}}
                { token: SERVICES.LOGGER, provider: { useValue: container.resolve(SERVICES.LOGGER)}},
                // { token: SERVICES.TRACER, provider: { useValue: container.resolve(SERVICES.TRACER)} },
                { token: IDOMAIN_FIELDS_REPO_SYMBOL, provider: {useValue: container.resolve(IDOMAIN_FIELDS_REPO_SYMBOL) } },
                { token: SERVICES.APPLICATION, provider: {useValue: container.resolve(SERVICES.APPLICATION)}},
                { token: schemaSymbol, provider: { useValue: container.resolve(schemaSymbol) } },
                { token: REDIS_SYMBOL, provider: { useValue: container.resolve(REDIS_SYMBOL) } },
              ],
              useChild: true,
            });
            requestSender = new SchemaRequestSender(app);
            redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
            await redisConnection.flushall();
          });

          it.each(testValues)(
            'should return 200 status code and map the tags $testCaseName',
            async ({ name, tagProperties, expectedProperties, key, value }) => {
              const tags = {
                properties: tagProperties,
              };
              const expected = {
                properties: expectedProperties,
              };
              await redisConnection.hset(hashKey, key, value);

              const response = await requestSender.map(name, tags);

              expect(response.status).toBe(httpStatusCodes.OK);
              // expect(response).toHaveProperty('status', httpStatusCodes.OK);

              const mappedTags = response.body as Tags;
              // console.log('-------------------------------------------------------------------')
              // console.log(mappedTags);
              // console.log('-------------------------------------------------------------------')
              // console.log(expected);
              // console.log('-------------------------------------------------------------------')

              expect(mappedTags).toBeDefined();
              expect(mappedTags).toMatchObject(expected);
            }
          );
        });

        describe('key is used by Redis', () => {
          beforeAll(async function () {
            await redisConnection.quit();
            container.clearInstances();
            await registerTestValues(applicationConfigs[0]?.application);
            // requestSender.init();
            const app = getApp({
              override: [
                { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
                { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
              ],
              useChild: true,
            });
            requestSender = new SchemaRequestSender(app);
            redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
            await redisConnection.flushall();
          });

          it.each(testValues)(
            'should return 200 status code and map the tags $testCaseName',
            async ({ name, tagProperties, expectedProperties, key, value }) => {
              const tags = {
                properties: tagProperties,
              };
              const expected = {
                properties: expectedProperties,
              };
              await redisConnection.set(key, value);

              const response = await requestSender.map(name, tags);
              expect(response).toHaveProperty('status', httpStatusCodes.OK);

              const mappedTags = response.body as Tags;
              expect(mappedTags).toBeDefined();
              expect(mappedTags).toMatchObject(expected);
            }
          );
        });
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    describe('GET /schemas/:name', function () {
      it('should return 404 status code for non-existent schema', async function () {
        const schemaName = 'system';
        const response = await requestSender.getSchema(schemaName);

        expect(response).toHaveProperty('status', httpStatusCodes.NOT_FOUND);

        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: `schema ${schemaName} not found` });
      });
    });
    describe('POST /schemas/:name/map', function () {
      it('should return 404 status code for non-existent schema', async function () {
        const geojson = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [125.6, 10.1] },
          properties: {
            key1: 'val2',
            externalKey2: 'val3',
            externalKey1: 'val1',
            key2: 'val4',
            wkt: 'POINT (125.6, 10.1)',
          },
        };

        const response = await requestSender.map('system', geojson);

        expect(response).toHaveProperty('status', httpStatusCodes.NOT_FOUND);

        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'schema system not found' });
      });

      describe('hash key is used by Redis', () => {
        beforeAll(async function () {
          await redisConnection.quit();
          container.clearInstances();
          await registerTestValues(applicationConfigs[1]?.application);
          // requestSender.init();
          const app = getApp({
            override: [
              { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
              { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            ],
            useChild: true,
          });
          requestSender = new SchemaRequestSender(app);
          redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
          await redisConnection.flushall();
        });
        it('should return 422 status code for malformed JSON response of exploded field in redis', async function () {
          const tags = {
            properties: {
              explode1: 'val5',
            },
          };

          await redisConnection.hset(hashKey, 'explode1:val5', '{ "exploded1": 2 "exploded2": 3 }');

          const response = await requestSender.map('system1', tags);
          expect(response).toHaveProperty('status', httpStatusCodes.UNPROCESSABLE_ENTITY);
          expect(response.body).toEqual({ message: `failed to fetch json for key: explode1:val5` });
        });
      });
      describe('key is used by Redis', () => {
        beforeAll(async function () {
          await redisConnection.quit();
          container.clearInstances();
          await registerTestValues(applicationConfigs[0]?.application);
          // requestSender.init();
          const app = getApp({
            override: [
              { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
              { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            ],
            useChild: true,
          });
          requestSender = new SchemaRequestSender(app);
          redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
          await redisConnection.flushall();
        });
        it('should return 422 status code for malformed JSON response of exploded field in redis', async function () {
          const tags = {
            properties: {
              explode1: 'val5',
            },
          };

          await redisConnection.set('explode1:val5', '{ "exploded1": 2 "exploded2": 3 }');

          const response = await requestSender.map('system1', tags);
          expect(response).toHaveProperty('status', httpStatusCodes.UNPROCESSABLE_ENTITY);
          expect(response.body).toEqual({ message: `failed to parse fetched json for key: explode1:val5` });
        });
      });

      it('should return 422 status code for not found explode field in redis', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
            explode1: 'val1',
          },
        };

        const response = await requestSender.map('system1', tags);
        expect(response).toHaveProperty('status', httpStatusCodes.UNPROCESSABLE_ENTITY);
        expect(response).toHaveProperty('body.message', 'failed to fetch json for key: explode1:val1');
      });
    });
  });
  describe('Sad Path', function () {
    describe('POST /schemas/:name/map', function () {
      describe('redis is not connected', function () {
        it('should return 500 status code for redis error', async function () {
          redisConnection.disconnect();
          const tags = {
            properties: {
              externalKey3: 'val3',
              externalKey2: 'val2',
              externalKey1: 'val1',
              key1: 'val4',
            },
          };

          const response = await requestSender.map('system2', tags);
          expect(response).toHaveProperty('status', httpStatusCodes.INTERNAL_SERVER_ERROR);
        });
      });
    });
  });
});
