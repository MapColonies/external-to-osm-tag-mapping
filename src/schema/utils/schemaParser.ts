import ajv from 'ajv/dist/jtd';
import { Schema, schemasTypeDefinition } from '../models/types';

export const parseSchema = (schemas: string): Schema[] | undefined => {
  const ajvInstance = new ajv();
  const schemaParser = ajvInstance.compileParser(schemasTypeDefinition);
  return schemaParser(schemas);
};
