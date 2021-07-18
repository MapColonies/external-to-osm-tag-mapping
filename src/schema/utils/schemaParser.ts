import Ajv, { JTDParser } from 'ajv/dist/jtd';
import { Schema, schemasTypeDefinition } from '../models/types';

let schemaParser: JTDParser<Schema[]> | undefined;

export const parseSchema = (schemas: string): Schema[] | undefined => {
  if (!schemaParser) {
    const ajv = new Ajv();
    schemaParser = ajv.compileParser(schemasTypeDefinition);
  }
  return schemaParser(schemas);
};
