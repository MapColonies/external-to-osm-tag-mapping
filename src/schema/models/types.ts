import { JTDSchemaType } from 'ajv/dist/core';

interface BaseSchema {
  createdAt: Date;
  updatedAt?: Date;
  ignoreKeys?: string[];
  name: string;
}

interface DisableExternalFetching extends BaseSchema {
  enableExternalFetch: 'no';
}

interface EnableExternalFetching extends BaseSchema {
  enableExternalFetch: 'yes';
  explodeKeys: string[];
  domainFieldsListKey: string;
}

export type Schema = DisableExternalFetching | EnableExternalFetching;

export const schemaSymbol = Symbol('schemas');

export const schemasTypeDefinition: JTDSchemaType<Schema[]> = {
  elements: {
    discriminator: 'enableExternalFetch',
    mapping: {
      yes: {
        properties: {
          name: { type: 'string', metadata: { minLength: 2, maxLength: 15 } },
          createdAt: { type: 'timestamp' },
          explodeKeys: { elements: { type: 'string' } },
          domainFieldsListKey: { type: 'string' },
        },
        optionalProperties: {
          updatedAt: { type: 'timestamp' },
          ignoreKeys: { elements: { type: 'string' } },
        },
      },
      no: {
        properties: {
          name: { type: 'string', metadata: { minLength: 2, maxLength: 15 } },
          createdAt: { type: 'timestamp' },
        },
        optionalProperties: {
          updatedAt: { type: 'timestamp' },
          ignoreKeys: { elements: { type: 'string' } },
        },
      },
    },
  },
};
