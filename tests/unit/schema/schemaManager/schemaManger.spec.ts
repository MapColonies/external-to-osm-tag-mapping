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

  describe('#getSchemas', () => {
    it('return all schemas', async () => {
      const res = await schemaManager.getSchemas();

      expect(res).toBeInstanceOf(Array);
    });
  });

  describe('#getSchema', () => {
    it('should return the specific schema', async () => {
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

    it('should return undefined for non-existent schema', async () => {
      getSchema = jest.fn().mockReturnValue(undefined);
      schemaManager = new SchemaManager({ getSchemas, getSchema });

      const name = 'notFoundSchema';

      const res = await schemaManager.getSchema(name);

      expect(res).toBeUndefined();
    });
  });

  describe('#map', () => {
    it('should return mapped tags with system name prefix', async () => {
      const name = 'system1';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
      };
      const expected = {
        system1_externalKey1: 'val1',
        system1_externalKey2: 'val2',
        system1_externalKey3: 'val3',
        system1_externalKey4: 'val4',
      };

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });
  });
});
