/* eslint-disable @typescript-eslint/naming-convention */
import { SchemaManager } from '../../../../src/schema/models/schemaManager';
import { Schema } from '../../../../src/schema/models/types';

const schemas: Schema[] = [
  {
    name: 'system1',
    createdAt: new Date(),
    enableExternalFetch: 'yes',
    domainFieldsListKey: 'DISCRETE_ATTRIBUTES',
    explodeKeys: ['explode1', 'explode2'],
  },
  {
    name: 'system2',
    createdAt: new Date(),
    ignoreKeys: ['externalKey4'],
    enableExternalFetch: 'yes',
    domainFieldsListKey: 'DISCRETE_ATTRIBUTES',
    explodeKeys: ['explode1', 'explode2'],
  },
  {
    name: 'system3',
    createdAt: new Date(),
    enableExternalFetch: 'no',
  },
];

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;
  let getFields: jest.Mock;
  let getDomainFieldsList: jest.Mock;

  beforeAll(() => {
    getFields = jest.fn();
    getDomainFieldsList = jest.fn();
    schemaManager = new SchemaManager(schemas, { getFields, getDomainFieldsList });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    it('should return mapped tags with system name prefix only', async () => {
      const name = 'system3';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
      };
      const expected = {
        system3_externalKey1: 'val1',
        system3_externalKey2: 'val2',
        system3_externalKey3: 'val3',
        system3_externalKey4: 'val4',
      };

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags with system name prefix without doamin key', async () => {
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

      getDomainFieldsList.mockResolvedValue(new Set());

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags with system name prefix & domain key & explode key', async () => {
      const name = 'system1';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
        explode1: 'val5',
      };
      const expected = {
        system1_externalKey1: 'val1',
        system1_externalKey2: 'val2',
        system1_externalKey3: 'val3',
        system1_externalKey4: 'val4',
        system1_explode1: 'val5',
        system1_EXTERNALKEY2_DOMAIN: 2,
        system1_exploded1: 2,
        system1_exploded2: 3,
      };

      getDomainFieldsList.mockResolvedValue(new Set(['EXTERNALKEY2', 'EXTERNALKEY5']));
      getFields.mockReturnValueOnce([2]);
      getFields.mockReturnValueOnce(['{ "exploded1": 2, "exploded2": 3 }']);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags without the ignored key', async () => {
      const name = 'system2';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
      };
      const expected = {
        system2_externalKey1: 'val1',
        system2_externalKey2: 'val2',
        system2_externalKey3: 'val3',
      };

      getDomainFieldsList.mockResolvedValue(new Set());

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags with system name prefix & domain key & without the ignored key', async () => {
      const name = 'system2';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
      };
      const expected = {
        system2_externalKey1: 'val1',
        system2_externalKey2: 'val2',
        system2_externalKey3: 'val3',
        system2_EXTERNALKEY2_DOMAIN: 2,
      };

      getDomainFieldsList.mockResolvedValue(new Set(['EXTERNALKEY2']));
      getFields.mockResolvedValue([2]);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });
  });
});
