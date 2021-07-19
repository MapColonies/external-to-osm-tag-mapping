import { JTDSchemaType } from 'ajv/dist/core';

export interface Schema {
  name: string;
  createdAt: Date;
  updatedAt?: Date;
  ignoreKeys?: string[];
}

export const schemaSymbol = Symbol('schemas');

export const schemasTypeDefinition: JTDSchemaType<Schema[]> = {
  elements: {
    properties: {
      name: { type: 'string', metadata: { minLength: 2, maxLength: 15 } },
      createdAt: { type: 'timestamp' },
    },
    optionalProperties: {
      updatedAt: { type: 'timestamp' },
      ignoreKeys: { elements: { type: 'string' } },
    },
  },
};
