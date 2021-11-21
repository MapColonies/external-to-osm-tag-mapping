/* eslint-disable @typescript-eslint/naming-convention */
import httpStatusCodes from 'http-status-codes';
import { Redis } from 'ioredis';
import { container } from 'tsyringe';
import { REDIS_SYMBOL } from '../../../src/common/constants';
import { Schema } from '../../../src/schema/models/types';
import { Tags } from '../../../src/schema/providers/fileProvider/fileProvider';
import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

describe('schemas', function () {
  const hashKeyOptions = [{ switch: 'Without' }, { switch: 'With', hashKey: 'hkey1' }];
  let redisConnection: Redis;
  beforeAll(async function () {
    await registerTestValues();
    requestSender.init();
    redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
    await redisConnection.flushall();
  });
  afterAll(async function () {
    await redisConnection.quit();
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

    describe('GET /schemas/:name/map', () => {
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
            system1_renamedExternalKey1: 'val1',
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

    describe('POST /schemas/:name/map', () => {
      afterEach(async function () {
        await redisConnection.flushall();
      });

      hashKeyOptions.forEach((hashKeyOption) => {
        describe(`${hashKeyOption.switch} hash keys`, () => {
          beforeAll(async function () {
            redisConnection.disconnect();
            container.clearInstances();
            if (hashKeyOption.hashKey !== undefined) {
              await registerTestValues({ hashKey: hashKeyOption.hashKey });
            } else {
              await registerTestValues();
            }
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
            if (hashKeyOption.hashKey !== undefined) {
              await redisConnection.hset(hashKeyOption.hashKey, 'EXTERNALKEY2:val2', '2');
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
                system2_exploded1_DOMAIN: 2,
                system2_exploded2_DOMAIN: 3,
              },
            };

            if (hashKeyOption.hashKey !== undefined) {
              await redisConnection.hset(hashKeyOption.hashKey, 'val4', '{ "exploded1": 2, "exploded2": 3 }');
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

            const response = await requestSender.map('system1', tags);
            expect(response.status).toBe(httpStatusCodes.OK);

            const mappedTags = response.body as Tags;
            expect(mappedTags).toBeDefined();
            expect(mappedTags).toMatchObject(expected);
          });

          it('should return 200 status code and map the tags without the ignored key, with exploded fields, with domain fields, with renamed key', async function () {
            const tags = {
              properties: {
                externalKey3: 'val3',
                externalKey2: 'val2',
                externalKey1: 'val1',
                explode1: 'val4',
                key1: 'val4',
                rename1: 'val1',
              },
            };
            const expected = {
              properties: {
                system2_externalKey2: 'val2',
                system2_EXTERNALKEY2_DOMAIN: '2',
                system2_externalKey1: 'val1',
                system2_externalKey3: 'val3',
                system2_explode1: 'val4',
                system2_exploded1_DOMAIN: 2,
                system2_exploded2_DOMAIN: 3,
                system2_renamedKey1: 'val1',
              },
            };

            await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'EXTERNALKEY2');
            if (hashKeyOption.hashKey !== undefined) {
              await redisConnection.hset(hashKeyOption.hashKey, 'EXTERNALKEY2:val2', '2');
              await redisConnection.hset(hashKeyOption.hashKey, 'val4', '{ "exploded1": 2, "exploded2": 3 }');
            } else {
              await redisConnection.set('EXTERNALKEY2:val2', '2');
              await redisConnection.set('val4', '{ "exploded1": 2, "exploded2": 3 }');
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
        const geoJson = {
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

        const response = await requestSender.map('system', geoJson);

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
          },
        };

        await redisConnection.lpush('DISCRETE_ATTRIBUTES', 'EXTERNALKEY2');

        const response = await requestSender.map('system1', tags);
        expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
      });
      it('should return 422 status code for not found domain field in redis', async function () {
        const tags = {
          properties: {
            externalKey3: 'val3',
            externalKey2: 'val2',
            externalKey1: 'val1',
            explode1: 'val4',
          },
        };

        const response = await requestSender.map('system1', tags);
        expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
      });
      hashKeyOptions.forEach((hashKeyOption) => {
        describe(`${hashKeyOption.switch} hash keys`, () => {
          beforeAll(async function () {
            redisConnection.disconnect();
            container.clearInstances();
            if (hashKeyOption.hashKey !== undefined) {
              await registerTestValues({ hashKey: hashKeyOption.hashKey });
            } else {
              await registerTestValues();
            }
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
            if (hashKeyOption.hashKey !== undefined) {
              await redisConnection.hset('hkey1', 'val5', '{ "exploded1": 2 "exploded2": 3 }');
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
        beforeAll(function () {
          redisConnection.disconnect();
        });
        it('should return 500 status code for redis error', async function () {
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
