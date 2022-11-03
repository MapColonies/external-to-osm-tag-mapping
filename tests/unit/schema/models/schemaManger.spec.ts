/* eslint-disable @typescript-eslint/naming-convention */
import { container } from 'tsyringe';
import jsLogger from '@map-colonies/js-logger';
import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../../../src/schema/DAL/domainFieldsRepository';
import { SchemaManager } from '../../../../src/schema/models/schemaManager';
import { Schema } from '../../../../src/schema/models/types';
import { SCHEMAS_SYMBOL, SERVICES } from '../../../../src/common/constants';
import { JSONSyntaxError, KeyNotFoundError, SchemaNotFoundError } from '../../../../src/common/errors';

const schemas: Schema[] = [
  {
    name: 'system1',
    createdAt: new Date(),
    enableExternalFetch: 'yes',
    addSchemaPrefix: true,
    renameKeys: { externalKey1: 'renamedExternalKey1', externalKeyRename: 'explode2' },
    explode: {
      keys: ['explode1', 'explode2'],
      lookupKeyFormat: '{key}:{val}',
      resultFormat: '{key}_DOMAIN',
    },
    domain: {
      lookupKeyFormat: 'att:{key}:{val}',
      resultFormat: '{key}_DOMAIN',
    },
  },
  {
    name: 'system2',
    createdAt: new Date(),
    ignoreKeys: ['key1'],
    enableExternalFetch: 'yes',
    addSchemaPrefix: true,
    renameKeys: { rename1: 'renamedKey1' },
    explode: {
      keys: ['explode1', 'explode2'],
      lookupKeyFormat: '{key}:{val}',
      resultFormat: '{key}_DOMAIN',
    },
    domain: {
      lookupKeyFormat: 'att:{key}:{val}',
      resultFormat: '{key}_DOMAIN',
    },
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
  {
    name: 'system5',
    createdAt: new Date(),
    enableExternalFetch: 'yes',
    addSchemaPrefix: true,
    renameKeys: { externalKey1: 'renamedExternalKey1' },
    explode: {
      keys: ['explode1', 'explode2'],
      lookupKeyFormat: '{key}:{value}',
      resultFormat: '{key}_DOMAIN',
    },
    domain: {
      lookupKeyFormat: 'att:{key}:{value}',
      resultFormat: '{key}_DOMAIN',
    },
  },
];

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;
  let getFields: jest.Mock;

  beforeAll(() => {
    getFields = jest.fn();
    container.register(SCHEMAS_SYMBOL, { useValue: schemas });
    container.register(IDOMAIN_FIELDS_REPO_SYMBOL, { useValue: { getFields } });
    container.register(SERVICES.LOGGER, { useValue: jsLogger({ enabled: false }) });

    schemaManager = container.resolve(SchemaManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#getSchemas', () => {
    it('return all schemas', () => {
      const res = schemaManager.getSchemas();

      expect(res).toBeInstanceOf(Array);
      expect(res).toHaveLength(schemas.length);
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

    it('should return mapped tags with system name prefix without domain key & renamed key', async () => {
      const name = 'system1';
      const tags = {
        externalKey1: 'val1',
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey4: 'val4',
      };
      const expected = {
        system1_renamedExternalKey1: 'val1',
        system1_externalKey2: 'val2',
        system1_externalKey3: 'val3',
        system1_externalKey4: 'val4',
      };

      getFields.mockResolvedValue([null, null, null, null]);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags when the renamed key is also a domain key', async function () {
      const name = 'system1';
      const tags = {
        externalKey1: 'val1',
      };
      const expected = {
        system1_renamedExternalKey1_DOMAIN: '1',
      };

      getFields.mockReturnValueOnce(['1']);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags when the renamed key is also an explode key', async function () {
      const name = 'system1';
      const tags = {
        externalKeyRename: 'val1',
      };
      const expected = {
        system1_explode2: 'val1',
        system1_exploded1_DOMAIN: '2',
        system1_exploded2_DOMAIN: '3',
      };

      getFields.mockReturnValueOnce(['{ "exploded1": 2, "exploded2": 3 }']);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags with system name prefix & domain key & explode key & renamed key & repo hash key', async () => {
      const name = 'system1';
      const tags = {
        externalKey3: 'val3',
        EXTERNALKEY2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
        explode1: 'val5',
      };
      const expected = {
        system1_renamedExternalKey1: 'val1',
        system1_EXTERNALKEY2: 'val2',
        system1_externalKey3: 'val3',
        system1_externalKey4: 'val4',
        system1_explode1: 'val5',
        system1_EXTERNALKEY2_DOMAIN: '2',
        system1_exploded1_DOMAIN: '2',
        system1_exploded2_DOMAIN: '3',
      };

      getFields.mockReturnValueOnce([null, '2', null, null]);
      getFields.mockReturnValueOnce(['{ "exploded1": 2, "exploded2": 3 }']);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags with system name prefix & domain key & explode key & renamed key & without repo hash key', async () => {
      const name = 'system5';
      const tags = {
        externalKey3: 'val3',
        EXTERNALKEY2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
        explode1: 'val5',
      };
      const expected = {
        system5_renamedExternalKey1: 'val1',
        system5_EXTERNALKEY2: 'val2',
        system5_externalKey3: 'val3',
        system5_externalKey4: 'val4',
        system5_explode1: 'val5',
        system5_EXTERNALKEY2_DOMAIN: '2',
        system5_exploded1_DOMAIN: '2',
        system5_exploded2_DOMAIN: '3',
      };

      getFields.mockReturnValueOnce([null, '2', null, null]);
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
        key1: 'val1',
      };
      const expected = {
        system2_externalKey1: 'val1',
        system2_externalKey2: 'val2',
        system2_externalKey3: 'val3',
        system2_externalKey4: 'val4',
      };

      getFields.mockReturnValueOnce([null, null, null, null]);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should return mapped tags with system name prefix & domain key & without the ignored key', async () => {
      const name = 'system2';
      const tags = {
        externalKey3: 'val3',
        EXTERNALKEY2: 'val2',
        externalKey1: 'val1',
        externalKey4: 'val4',
        key1: 'val1',
      };
      const expected = {
        system2_externalKey1: 'val1',
        system2_EXTERNALKEY2: 'val2',
        system2_externalKey3: 'val3',
        system2_externalKey4: 'val4',
        system2_EXTERNALKEY2_DOMAIN: '2',
      };

      getFields.mockResolvedValue([null, '2', null, null]);
      const expectedKeysLength = Object.keys(expected).length;

      const res = await schemaManager.map(name, tags);
      const keysLength = Object.keys(res).length;

      expect(res).toMatchObject(expected);
      expect(keysLength).toBe(expectedKeysLength);
    });

    it('should return mapped tags with system name prefix & domain key & explode key & values with non-ascii characters', async () => {
      const name = 'system5';
      const tags = {
        externalKey3: 'val3',
        externalKey2: 'val2',
        externalKey1: 'בדיקה',
        externalKey4: 'val4',
        externalKEY5: 'שלום שלום/מנכ"ל',
        explode1: 'שלום\\עולם',
      };
      const expected = {
        system5_renamedExternalKey1: 'בדיקה',
        system5_externalKey2: 'val2',
        system5_externalKey3: 'val3',
        system5_externalKey4: 'val4',
        system5_externalKEY5: 'שלום שלום/מנכ"ל',
        system5_explode1: 'שלום\\עולם',
        system5_externalKey2_DOMAIN: '2',
        system5_externalKEY5_DOMAIN: 'בדיקה',
        system5_exploded1_DOMAIN: '2',
        system5_exploded2_DOMAIN: '3',
      };

      getFields.mockReturnValueOnce([null, '2', null, null, 'בדיקה']);
      getFields.mockReturnValueOnce(['{ "exploded1": "2", "exploded2": "3" }']);
      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('when system name not in schemas, should throw an error', async () => {
      const name = 'system';
      const tags = {};

      const res = schemaManager.map(name, tags);

      await expect(res).rejects.toThrow(SchemaNotFoundError);
    });

    it('when malformed JSON response recieved from domain provider for exploded field, should throw an error', async () => {
      const name = 'system1';
      const tags = {
        explode1: 'val1',
      };

      getFields.mockResolvedValue(['{"exploded1": "2" "exploded2": "3"}']);

      const res = schemaManager.map(name, tags);

      await expect(res).rejects.toThrow(JSONSyntaxError);
    });

    it('should return a null valued key from exploded field who has a null property', async () => {
      const name = 'system1';
      const tags = {
        explode1: 'val1',
        explode2: 'val2',
      };
      const expected = {
        system1_explode1: 'val1',
        system1_explode2: 'val2',
        system1_exploded1_DOMAIN: null,
        system1_exploded2_DOMAIN: '3',
      };

      getFields.mockResolvedValue(['{"exploded1": null, "exploded2": "3"}']);

      const res = await schemaManager.map(name, tags);

      expect(res).toMatchObject(expected);
    });

    it('should throw key not found error if a given explode key field is null', async () => {
      const name = 'system1';
      const tags = {
        explode1: 'val1',
      };

      getFields.mockResolvedValue([null]);

      const res = schemaManager.map(name, tags);

      await expect(res).rejects.toThrow(KeyNotFoundError);
    });
  });
});
