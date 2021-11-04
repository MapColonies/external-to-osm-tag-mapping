/* eslint-disable @typescript-eslint/naming-convention */
import { container } from 'tsyringe';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../../../src/schema/DAL/domainFieldsRepository';
import { SchemaManager, SchemaNotFoundError } from '../../../../src/schema/models/schemaManager';
import { Schema, schemaSymbol } from '../../../../src/schema/models/types';

const schemas: Schema[] = [
  {
    name: 'system1',
    createdAt: new Date(),
    enableExternalFetch: 'yes',
    addSchemaPrefix: true,
    domainFieldsListKey: 'DISCRETE_ATTRIBUTES',
    explodeKeys: ['explode1', 'explode2'],
    renameKeys: { externalKey1: 'renamedExternalKey1' },
  },
  {
    name: 'system2',
    createdAt: new Date(),
    ignoreKeys: ['externalKey4'],
    enableExternalFetch: 'yes',
    addSchemaPrefix: true,
    domainFieldsListKey: 'DISCRETE_ATTRIBUTES',
    explodeKeys: ['explode1', 'explode2'],
  },
  {
    name: 'system3',
    createdAt: new Date(),
    enableExternalFetch: 'no',
    addSchemaPrefix: true,
  },
  {
    name: 'system4',
    createdAt: new Date(),
    enableExternalFetch: 'no',
    addSchemaPrefix: false,
  },
];

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;
  let getFields: jest.Mock;
  let getDomainFieldsList: jest.Mock;

  beforeAll(() => {
    getFields = jest.fn();
    getDomainFieldsList = jest.fn();
    container.register(schemaSymbol, { useValue: schemas });
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useValue: { getFields, getDomainFieldsList } });

    schemaManager = container.resolve(SchemaManager);
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

    it('should return mapped tags without system name prefix', async () => {
      const name = 'system4';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
      };
      const expected = {
        externalKey1: 'val1',
        externalKey2: 'val2',
        externalKey3: 'val3',
        externalKey4: 'val4',
      };

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags with system name prefix without domain key', async () => {
      const name = 'system1';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
      };
      const expected = {
        system1_renamedExternalKey1: 'val1',
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
        system1_renamedExternalKey1: 'val1',
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

    it('when system name not in schemas, should throw an error', async () => {
      const name = 'system5';
      const tags = {};

      const res = schemaManager.map(name, tags);

      await expect(res).rejects.toThrow(SchemaNotFoundError);
    });
  });
});
