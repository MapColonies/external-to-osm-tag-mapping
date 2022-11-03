interface BaseSchema {
  createdAt: Date;
  updatedAt?: Date;
  ignoreKeys?: string[];
  addSchemaPrefix: boolean;
  name: string;
  renameKeys?: Record<string, string>;
}

interface DisableExternalFetching extends BaseSchema {
  enableExternalFetch: 'no';
}

interface EnableExternalFetching extends BaseSchema {
  enableExternalFetch: 'yes';
  explode: ExplodeSchema;
  domain: DomainSchema;
}

interface ExplodeSchema {
  keys: string[];
  lookupKeyFormat: string;
  resultFormat: string;
}

interface DomainSchema {
  lookupKeyFormat: string;
  resultFormat: string;
}

export type Schema = DisableExternalFetching | EnableExternalFetching;

export type Tags = Record<string, string | number | boolean | null>;

export interface MappingDebug {
  type: 'domain' | 'explode';
  key: string;
  result: string[];
}

export interface TagMappingResult {
  tags: Tags;
  debug?: MappingDebug[];
}
