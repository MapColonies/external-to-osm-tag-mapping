import { Schema } from "../models/types";

export interface ISchemaProvider {
  loadSchemas: () => Promise<Schema[]>;
}