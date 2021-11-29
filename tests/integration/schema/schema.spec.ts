/* eslint-disable @typescript-eslint/naming-convention */
import httpStatusCodes from 'http-status-codes';
import { Redis } from 'ioredis';
import { container } from 'tsyringe';
import { REDIS_SYMBOL } from '../../../src/common/constants';
import { IApplication } from '../../../src/common/interfaces';
import { Schema } from '../../../src/schema/models/types';
import { Tags } from '../../../src/schema/providers/fileProvider/fileProvider';
import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

describe('schemas', function () {
  const applicationConfigs: IApplication[] = [{ hashKey: { enabled: false } }, { hashKey: { enabled: true, value: 'hashKey1' } }];
  let redisConnection: Redis;
  beforeAll(async function () {
    await registerTestValues();
    requestSender.init();
    redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
  });
  afterAll(async function () {
    await redisConnection.quit();
  });

  beforeEach(async function () {
    await redisConnection.flushall();
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
    });

    describe('POST /schemas/:name/map', () => {
      it('should return 200 status code and map the tags', async function () {
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

        await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'EXTERNALKEY2');
        await redisConnection.set('EXTERNALKEY2:val2', 'newVal');

        const response = await requestSender.map('system1', tags);
        expect(response.status).toBe(httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });

      it('should return 200 status code and map the tags when the requested keys are not in the domain', async function () {
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

        await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'NOT_EXISTING_KEY');

        const response = await requestSender.map('system1', tags);
        expect(response.status).toBe(httpStatusCodes.OK);

        const mappedTags = response.body as Tags;
        expect(mappedTags).toBeDefined();
        expect(mappedTags).toMatchObject(expected);
      });

      applicationConfigs.forEach((appConfig) => {
        describe(`${appConfig.hashKey.enabled ? 'with' : 'without'} hash keys`, () => {
          beforeAll(async function () {
            await redisConnection.quit();
            container.clearInstances();
            await registerTestValues(appConfig);
            requestSender.init();
            redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
            await redisConnection.flushall();
          });

          it('should return 200 status code and map the tags', async function () {
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
            expect(response.status).toBe(httpStatusCodes.OK);

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
            expect(response.status).toBe(httpStatusCodes.OK);

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

            await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'NOT_EXISTING_KEY');

            const response = await requestSender.map('system2', tags);
            expect(response.status).toBe(httpStatusCodes.OK);

            const mappedTags = response.body as Tags;
            expect(mappedTags).toBeDefined();
            expect(mappedTags).toMatchObject(expected);
          });

          it('should return 200 status code and map the tags with domain fields', async function () {
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
                system2_EXTERNALKEY2_DOMAIN: '2',
              },
            };

            await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'EXTERNALKEY2');

            if (appConfig.hashKey.enabled) {
              await redisConnection.hset(appConfig.hashKey.value as string, 'EXTERNALKEY2:val2', '2');
            } else {
              await redisConnection.set('EXTERNALKEY2:val2', '2');
            }

            const response = await requestSender.map('system2', tags);
            expect(response.status).toBe(httpStatusCodes.OK);

            const mappedTags = response.body as Tags;
            expect(mappedTags).toBeDefined();
            expect(mappedTags).toMatchObject(expected);
          });

          it('should return 200 status code and map the tags with explode fields', async function () {
            const tags = {
              properties: {
                externalKey3: 'val3',
                externalKey2: 'val2',
                externalKey1: 'val1',
                explode1: 'val4',
              },
            };
            const expected = {
              properties: {
                system2_externalKey1: 'val1',
                system2_externalKey2: 'val2',
                system2_externalKey3: 'val3',
                system2_explode1: 'val4',
                system2_exploded1_DOMAIN: '2',
                system2_exploded2_DOMAIN: '3',
              },
            };

            await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'NOT_EXISTING_KEY');

            if (appConfig.hashKey.enabled) {
              await redisConnection.hset(appConfig.hashKey.value as string, 'val4', '{ "exploded1": 2, "exploded2": 3 }');
            } else {
              await redisConnection.set('val4', '{ "exploded1": 2, "exploded2": 3 }');
            }

            const response = await requestSender.map('system2', tags);
            expect(response.status).toBe(httpStatusCodes.OK);

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

            await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'NOT_EXISTING_KEY');

            const response = await requestSender.map('system1', tags);
            expect(response.status).toBe(httpStatusCodes.OK);

            const mappedTags = response.body as Tags;
            expect(mappedTags).toBeDefined();
            expect(mappedTags).toMatchObject(expected);
          });

          it('should return 200 status code and map the tags without the ignored key, with exploded fields, with domain fields, with renamed key, with values containing non-ascii characters', async function () {
            const tags = {
              properties: {
                externalKey3: 'שלום שלום/מנכ"ל',
                externalKey2: 'val2',
                externalKey1: 'val1',
                explode1: 'val4',
                explode2: 'שלום שלום/מנכ"ל',
                key1: 'val4',
                rename1: 'val1',
              },
            };
            const expected = {
              properties: {
                system2_externalKey2: 'val2',
                system2_EXTERNALKEY2_DOMAIN: '2',
                system2_externalKey1: 'val1',
                system2_externalKey3: 'שלום שלום/מנכ"ל',
                system2_EXTERNALKEY3_DOMAIN: '2',
                system2_explode1: 'val4',
                system2_explode2: 'שלום שלום/מנכ"ל',
                system2_exploded1_DOMAIN: '2',
                system2_exploded1_heb_DOMAIN: '2',
                system2_exploded2_DOMAIN: '3',
                system2_exploded2_heb_DOMAIN: '3',
                system2_renamedKey1: 'val1',
              },
            };

            await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'EXTERNALKEY2', 'EXTERNALKEY3');
            if (appConfig.hashKey.enabled) {
              const { value } = appConfig.hashKey;
              await redisConnection.hset(value as string, 'EXTERNALKEY2:val2', '2');
              await redisConnection.hset(value as string, 'EXTERNALKEY3:שלום שלום/מנכ"ל', '2');
              await redisConnection.hset(value as string, 'val4', '{ "exploded1": 2, "exploded2": 3 }');
              await redisConnection.hset(value as string, 'שלום שלום/מנכ"ל', '{ "exploded1_heb": 2, "exploded2_heb": 3 }');
            } else {
              await redisConnection.set('EXTERNALKEY2:val2', '2');
              await redisConnection.set('EXTERNALKEY3:שלום שלום/מנכ"ל', '2');
              await redisConnection.set('val4', '{ "exploded1": 2, "exploded2": 3 }');
              await redisConnection.set('שלום שלום/מנכ"ל', '{ "exploded1_heb": 2, "exploded2_heb": 3 }');
            }

            const response = await requestSender.map('system2', tags);
            expect(response.status).toBe(httpStatusCodes.OK);

            const mappedTags = response.body as Tags;
            expect(mappedTags).toBeDefined();
            expect(mappedTags).toMatchObject(expected);
          });
        });
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    describe('GET /schemas/:name', function () {
      it('should return 404 status code for non-existent schema', async function () {
        const response = await requestSender.getSchema('system');

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);

        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'system system not found' });
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

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        const schemas = response.body as Schema;
        expect(schemas).toEqual({ message: 'schema system not found' });
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
        expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
      });
      it('should return 422 status code for not found domain field in redis', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
          },
        };

        await redisConnection.del('DISCRETE_ATTRIBUTES');

        const response = await requestSender.map('system1', tags);
        expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
      });
      applicationConfigs.forEach((appConfig) => {
        describe(`${appConfig.hashKey.enabled ? 'with' : 'without'} hash keys`, () => {
          beforeAll(async function () {
            await redisConnection.quit();
            container.clearInstances();
            await registerTestValues(appConfig);
            requestSender.init();
            redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
            await redisConnection.flushall();
          });

          it('should return 422 status code for malformed JSON response of exploded field in redis', async function () {
            const tags = {
              properties: {
                explode1: 'val5',
              },
            };

            await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'EXPLODED1');
            if (appConfig.hashKey.enabled) {
              await redisConnection.hset(appConfig.hashKey.value as string, 'val5', '{ "exploded1": 2 "exploded2": 3 }');
            } else {
              await redisConnection.set('val5', '{ "exploded1": 2 "exploded2": 3 }');
            }

            const response = await requestSender.map('system1', tags);
            expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
            expect(response.body).toEqual({ message: `failed to parse fetched json for value: val5` });
          });
        });
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
          expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        });
      });
    });
  });
});
