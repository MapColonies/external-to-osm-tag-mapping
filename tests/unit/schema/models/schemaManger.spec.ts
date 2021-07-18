/* eslint-disable @typescript-eslint/naming-convention */
import { SchemaManager } from '../../../../src/schema/models/schemaManager';

const schemas = [
  {
    name: 'system1',
    createdAt: new Date(),
  },
  {
    name: 'system2',
    createdAt: new Date(),
  },
];

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;
  beforeAll(() => {
    schemaManager = new SchemaManager(schemas);
  });
  describe('#getSchemas', () => {
    it('return all schemas', () => {
      const res = schemaManager.getSchemas();

      expect(res).toBeInstanceOf(Array);
    });
  });

  describe('#getSchema', () => {
    it('should return the specific schema', () => {
      const res = schemaManager.getSchema(schemas[0].name);

      expect(res).toMatchObject(schemas[0]);
    });

    it('should return undefined for non-existent schema', () => {
      const name = 'notFoundSchema';

      const res = schemaManager.getSchema(name);

      expect(res).toBeUndefined();
    });
  });

  describe('#map', () => {
    it('should return mapped tags with system name prefix', () => {
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

      const res = schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });
  });
});
