import Ajv from 'ajv/dist/jtd';
import { Schema, schemasTypeDefinition } from '../models/types';

export const parseSchema = (schemas: string): Schema[] | undefined => {
  const ajv = new Ajv();
  const schemaParser = ajv.compileParser(schemasTypeDefinition);
  return schemaParser(schemas);
};
