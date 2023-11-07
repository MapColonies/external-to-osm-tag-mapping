import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import client from 'prom-client';
import { IDomainFieldsRepository, IDOMAIN_FIELDS_REPO_SYMBOL } from '../DAL/domainFieldsRepository';
import { Tags } from '../../common/types';
import { KEYS_SEPARATOR, REDIS_KEYS_SEPARATOR, SERVICES, METRICS_REGISTRY } from '../../common/constants';
import { KeyNotFoundError } from '../DAL/errors';
import { keyConstructor } from '../DAL/keys';
import { Schema, schemaSymbol } from './types';

interface SchemaMetadataBase {
  keyIgnoreSets: Set<string>;
  addSchemaPrefix: boolean;
  renameKeys?: Record<string, string>;
}

interface WithExternalFetch extends SchemaMetadataBase {
  enableExternalFetch: true;
  explodeKeysSet: Set<string>;
  explodePrefix: string;
  domainPrefix: string;
}

interface WithoutExternalFetch extends SchemaMetadataBase {
  enableExternalFetch: false;
}

type SchemaMetadata = WithExternalFetch | WithoutExternalFetch;

export class SchemaNotFoundError extends Error {}
export class JSONSyntaxError extends SyntaxError {}

@injectable()
export class SchemaManager {
  private readonly schemas: Record<string, SchemaMetadata>;
  private readonly schemaCounter: client.Counter<'status' | 'schemaName'>;

  public constructor(
    @inject(schemaSymbol) private readonly inputSchemas: Schema[],
    @inject(IDOMAIN_FIELDS_REPO_SYMBOL) private readonly domainFieldsRepo: IDomainFieldsRepository,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(METRICS_REGISTRY) registry: client.Registry
  ) {
    this.schemaCounter = new client.Counter({
      name: 'change_count',
      help: 'The overall change stats',
      labelNames: ['status', 'schemaName'] as const,
      registers: [registry],
    });
    this.schemas = inputSchemas.reduce((acc, curr) => {
      let schemaMetadata: SchemaMetadata = {
        keyIgnoreSets: new Set(curr.ignoreKeys),
        enableExternalFetch: false,
        addSchemaPrefix: curr.addSchemaPrefix,
        ...(curr.renameKeys && { renameKeys: curr.renameKeys }),
      };

      if (curr.enableExternalFetch === 'yes') {
        schemaMetadata = {
          ...schemaMetadata,
          enableExternalFetch: true,
          explodeKeysSet: new Set(curr.explodeKeys),
          explodePrefix: curr.explodePrefix,
          domainPrefix: curr.domainPrefix,
        };
      }
      return { ...acc, [curr.name]: schemaMetadata };
    }, {});
  }

  public getSchemas(): Schema[] {
    this.logger.info({ msg: 'getting all schemas', count: this.inputSchemas.length });

    return this.inputSchemas;
  }

  public getSchema(name: string): Schema | undefined {
    this.logger.info({ msg: 'getting schema', schemaName: name });

    return this.inputSchemas.find((schema) => schema.name === name);
  }

  public async map(name: string, tags: Tags): Promise<Tags> {
    this.logger.info({ msg: 'starting tag mapping', schemaName: name, count: Object.keys(tags).length });

    if (this.getSchema(name) === undefined) {
      this.logger.error({ msg: 'schema not found', schemaName: name });
      this.schemaCounter.inc({ status: 'error' });
      throw new SchemaNotFoundError(`schema ${name} not found`);
    }

    const schema = this.schemas[name];
    const domainKeys: string[] = []; // array to hold all domain keys
    const explodeKeys: string[] = []; // array to hold all explode keys

    let finalTags: Tags = Object.entries(tags).reduce((acc: Tags, [key, value]) => {
      // remove tag if it's an ignored key
      if (schema.keyIgnoreSets.has(key)) {
        return acc;
      }

      // check if tag's key should be renamed
      if (schema.renameKeys && Object.prototype.hasOwnProperty.call(schema.renameKeys, key)) {
        key = schema.renameKeys[key];
        this.schemaCounter.inc({ status: 'renamed', schemaName: name });
      }

      if (schema.enableExternalFetch) {
        // check each tag if it's an explode field and put it in explodeKeys
        if (schema.explodeKeysSet.has(key) && value !== null) {
          explodeKeys.push(`${keyConstructor(schema.explodePrefix, key, value.toString())}`);
        } else if (value !== null) {
          domainKeys.push(`${keyConstructor(schema.domainPrefix, key.toUpperCase(), value.toString())}`);
        }
      }

      acc[key] = value;
      return acc;
    }, {});

    let domainFieldsTags = {};
    let explodeFieldsTags = {};

    this.logger.debug({
      msg: 'tag mapping keys counter',
      schemaName: name,
      domainKeysCount: domainKeys.length,
      explodeKeysCount: explodeKeys.length,
    });
    this.schemaCounter.inc({ status: 'domainKeysCount', schemaName: name }, domainKeys.length);
    this.schemaCounter.inc({ status: 'explodeKeysCount', schemaName: name }, explodeKeys.length);

    if (domainKeys.length > 0) {
      domainFieldsTags = await this.getDomainFieldsCodedValues(domainKeys);
    }

    if (explodeKeys.length > 0) {
      explodeFieldsTags = await this.getExplodeFields(explodeKeys);
    }

    finalTags = { ...finalTags, ...domainFieldsTags, ...explodeFieldsTags };

    if (this.schemas[name].addSchemaPrefix) {
      // for each key add a system name prefix
      finalTags = Object.entries(finalTags).reduce((acc: Tags, [key, value]) => {
        acc[this.concatenateKeysPrefix(name, key)] = value;
        return acc;
      }, {});
    }

    this.logger.debug({
      msg: 'final tags mapping counter',
      schemaName: name,
      tagsCount: Object.keys(finalTags).length,
    });
    this.schemaCounter.inc({ status: 'tagsCount', schemaName: name }, Object.keys(finalTags).length);

    return finalTags;
  }

  private readonly concatenateKeysPrefix = (prefix: string, ...keys: string[]): string => {
    return `${[prefix, ...keys].join(KEYS_SEPARATOR)}`;
  };

  private readonly getDomainFieldsCodedValues = async (domainKeys: string[]): Promise<Tags> => {
    let domainFieldsTags: Tags = {};
    const fieldsCodedValues = await this.domainFieldsRepo.getFields(domainKeys);

    fieldsCodedValues.forEach((codedValue, index) => {
      if (codedValue !== null) {
        domainFieldsTags = {
          ...domainFieldsTags,
          [domainKeys[index].split(REDIS_KEYS_SEPARATOR)[1] + '_DOMAIN']: codedValue,
        };
      }
    });

    return domainFieldsTags;
  };

  private readonly getExplodeFields = async (explodeKeys: string[]): Promise<Tags> => {
    let explodeFieldsTags: Tags = {};
    const explodeFields = await this.domainFieldsRepo.getFields(explodeKeys);

    // for each explode field parse for new Object.
    explodeFields.forEach((jsonString, index) => {
      if (jsonString === null) {
        this.logger.error({ msg: 'failed to fetch json for explode key', key: explodeKeys[index] });
        this.schemaCounter.inc({ status: 'error' });
        throw new KeyNotFoundError(`failed to fetch json for key: ${explodeKeys[index]}`);
      }

      try {
        const json = JSON.parse(jsonString) as Record<string, string | number | null>;
        const explodedFields = Object.entries(json).reduce((acc: Tags, [key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            acc[key + '_DOMAIN'] = value.toString();
          }
          return acc;
        }, {});
        explodeFieldsTags = { ...explodeFieldsTags, ...explodedFields };
      } catch (error) {
        this.logger.error({ msg: 'failed to parse json for explode key', key: explodeKeys[index] });
        this.schemaCounter.inc({ status: 'error' });
        throw new JSONSyntaxError(`failed to parse fetched json for key: ${explodeKeys[index]}`);
      }
    });

    return explodeFieldsTags;
  };
}
