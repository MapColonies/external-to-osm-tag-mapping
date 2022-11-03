import Ajv from 'ajv/dist/jtd';
import { JTDSchemaType } from 'ajv/dist/core';
import { Schema } from '../models/types';

const SCHEMA_NAME_MIN_LENGTH = 2;
const SCHEMA_NAME_MAX_LENGTH = 15;

const schemasTypeDefinition: JTDSchemaType<Schema[]> = {
  elements: {
    discriminator: 'enableExternalFetch',
    mapping: {
      yes: {
        properties: {
          name: { type: 'string', metadata: { minLength: SCHEMA_NAME_MIN_LENGTH, maxLength: SCHEMA_NAME_MAX_LENGTH } },
          createdAt: { type: 'timestamp' },
          addSchemaPrefix: { type: 'boolean' },
          explode: {
            properties: { keys: { elements: { type: 'string' } }, resultFormat: { type: 'string' }, lookupKeyFormat: { type: 'string' } },
          },
          domain: { properties: { resultFormat: { type: 'string' }, lookupKeyFormat: { type: 'string' } } },
        },
        optionalProperties: {
          updatedAt: { type: 'timestamp' },
          ignoreKeys: { elements: { type: 'string' } },
          renameKeys: { values: { type: 'string' } },
        },
      },
      no: {
        properties: {
          name: { type: 'string', metadata: { minLength: SCHEMA_NAME_MIN_LENGTH, maxLength: SCHEMA_NAME_MAX_LENGTH } },
          createdAt: { type: 'timestamp' },
          addSchemaPrefix: { type: 'boolean' },
        },
        optionalProperties: {
          updatedAt: { type: 'timestamp' },
          ignoreKeys: { elements: { type: 'string' } },
          renameKeys: { values: { type: 'string' } },
        },
      },
    },
  },
};

const ajv = new Ajv();

export const parseSchema = (schemas: string): Schema[] | undefined => {
  const schemaParser = ajv.compileParser(schemasTypeDefinition);
  return schemaParser(schemas);
};
