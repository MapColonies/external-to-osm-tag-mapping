/* eslint-disable @typescript-eslint/naming-convention */
import { SchemaManager } from '../../../../src/schema/models/schemaManager';

let schemaManager: SchemaManager;

describe('SchemaManager', () => {
  let getSchema: jest.Mock;
  let getSchemas: jest.Mock;

  const schema = {
    name: 'system1',
    createdAt: '111',
    updatedAt: '1111',
    mapping: {
      externalKey1: 'osmKey1',
      externalKey2: 'osmKey2',
    },
  };

  beforeEach(() => {
    getSchemas = jest.fn().mockReturnValue([schema]);
    getSchema = jest.fn().mockReturnValue(schema);
    schemaManager = new SchemaManager({ getSchemas, getSchema });
  });

  afterEach(() => {
    getSchemas.mockReset();
  });

  describe('getSchemas', () => {
    it('return all schemas', async () => {
      const res = await schemaManager.getSchemas();

      expect(res).toBeInstanceOf(Array);
    });
  });

  describe('getSchema', () => {
    it('return specific schema', async () => {
      const name = 'system1';
      const expected = {
        name: 'system1',
        createdAt: '111',
        updatedAt: '1111',
        mapping: {
          externalKey1: 'osmKey1',
          externalKey2: 'osmKey2',
        },
      };

      const res = await schemaManager.getSchema(name);

      expect(res).toMatchObject(expected);
    });
    it('return undefined', async () => {
      getSchema = jest.fn().mockReturnValue(undefined);
      schemaManager = new SchemaManager({ getSchemas, getSchema });

      const name = 'notFoundSchema';
      const expected = undefined;

      const res = await schemaManager.getSchema(name);

      expect(res).toBe(expected);
    });
  });

  describe('map', () => {
    it('return mapped tags with system name', async () => {
      const name = 'system1';
      const tags = {
        key1: 'val2',
        externalKey2: 'val3',
        externalKey1: 'val1',
        key2: 'val4',
      };
      const expected = {
        system1_key1: 'val2',
        system1_osmKey2: 'val3',
        system1_osmKey1: 'val1',
        system1_key2: 'val4',
      };

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('return mapped tags with system name, without schema', async () => {
      getSchema = jest.fn().mockReturnValue(undefined);
      schemaManager = new SchemaManager({ getSchemas, getSchema });
      const name = 'noSchema';
      const tags = {
        externalKey1: 'val1',
        externalKey2: 'val2',
        externalKey3: 'val3',
        externalKey4: 'val4',
      };
      const expected = {
        noSchema_externalKey1: 'val1',
        noSchema_externalKey2: 'val2',
        noSchema_externalKey3: 'val3',
        noSchema_externalKey4: 'val4',
      };

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('return empty tags object', async () => {
      const name = 'system1';
      const tags = {};
      const expected = {};

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });
  });
});
