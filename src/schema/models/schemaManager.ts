import { inject, injectable } from 'tsyringe';
import Format from 'string-format';
import { Logger } from '@map-colonies/js-logger';
import { IDomainFieldsRepository, IDOMAIN_FIELDS_REPO_SYMBOL } from '../DAL/domainFieldsRepository';
import { SCHEMA_NAME_PREFIX_SEPARATOR, NOT_FOUND_INDEX, SCHEMAS_SYMBOL, SERVICES } from '../../common/constants';
import { JSONSyntaxError, KeyNotFoundError, SchemaNotFoundError } from '../../common/errors';
import { Schema, Tags } from './types';

interface MappingKey {
  key: string;
  lookupKey: string;
}

type RenameFn = (key: string) => string;

@injectable()
export class SchemaManager {
  public constructor(
    @inject(SCHEMAS_SYMBOL) private readonly inputSchemas: Schema[],
    @inject(IDOMAIN_FIELDS_REPO_SYMBOL) private readonly domainFieldsRepo: IDomainFieldsRepository,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {}

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

    const schema = this.getSchema(name);

    if (!schema) {
      this.logger.error({ msg: 'schema not found', schemaName: name });
      throw new SchemaNotFoundError(`schema ${name} not found`);
    }

    const domainKeys: MappingKey[] = []; // array to hold all domain keys
    const explodeKeys: MappingKey[] = []; // array to hold all explode keys

    let finalTags: Tags = Object.entries(tags).reduce((acc: Tags, [key, value]) => {
      // remove tag if it's an ignored key
      if (schema.ignoreKeys && schema.ignoreKeys.indexOf(key) !== NOT_FOUND_INDEX) {
        return acc;
      }

      // check if tag's key should be renamed
      if (schema.renameKeys && Object.prototype.hasOwnProperty.call(schema.renameKeys, key)) {
        key = schema.renameKeys[key];
      }

      if (schema.enableExternalFetch === 'yes') {
        // check each tag if it's an explode field and put it in explodeKeys
        if (schema.explode.keys.indexOf(key) !== NOT_FOUND_INDEX && value !== null) {
          const lookupKey = Format(schema.explode.lookupKeyFormat, { key, value });
          explodeKeys.push({ key, lookupKey });
        } else if (value !== null) {
          const lookupKey = Format(schema.domain.lookupKeyFormat, { key, value });
          domainKeys.push({
            key,
            lookupKey,
          });
        }
      }

      const keyWithPossiblyPrefix = schema.addSchemaPrefix ? `${schema.name}${SCHEMA_NAME_PREFIX_SEPARATOR}${key}` : key;
      acc[keyWithPossiblyPrefix] = value;
      return acc;
    }, {});

    this.logger.debug({
      msg: 'tag mapping keys counter',
      schemaName: name,
      domainKeysCount: domainKeys.length,
      explodeKeysCount: explodeKeys.length,
    });

    // get the renaming function based on addSchemaPrefix flag
    const getRenameFn = (format: string): RenameFn => {
      return (key: string): string => {
        if (schema.addSchemaPrefix) {
          return Format(`{schemaName}${SCHEMA_NAME_PREFIX_SEPARATOR}${format}`, { key, schemaName: schema.name });
        }

        return Format(format, { key });
      };
    };

    let domainFieldsTags = {};
    let explodeFieldsTags = {};

    if (schema.enableExternalFetch === 'yes' && domainKeys.length > 0) {
      const tagRenameFn = getRenameFn(schema.domain.resultFormat);
      domainFieldsTags = await this.getDomainFieldsCodedValues(domainKeys, tagRenameFn);
    }

    if (schema.enableExternalFetch === 'yes' && explodeKeys.length > 0) {
      const tagRenameFn = getRenameFn(schema.explode.resultFormat);
      explodeFieldsTags = await this.getExplodeFields(explodeKeys, tagRenameFn);
    }

    finalTags = { ...finalTags, ...domainFieldsTags, ...explodeFieldsTags };

    this.logger.debug({
      msg: 'tags mapping counter',
      schemaName: name,
      preMappingCount: Object.keys(tags).length,
      postMappingCount: Object.keys(finalTags).length,
    });

    return finalTags;
  }

  private readonly getDomainFieldsCodedValues = async (domainMapKeys: MappingKey[], renameFn: RenameFn): Promise<Tags> => {
    const domainFieldsTags: Tags = {};
    const domainKeys = domainMapKeys.map((key) => key.key);
    const domainLookupKeys = domainMapKeys.map((key) => key.lookupKey);

    const fieldsCodedValues = await this.domainFieldsRepo.getFields(domainLookupKeys);

    // for each domain field create new domain field tag with the fetched value
    fieldsCodedValues.forEach((codedValue, index) => {
      if (codedValue !== null) {
        const newKey = renameFn(domainKeys[index]);

        domainFieldsTags[newKey] = codedValue;
      }
    });

    return domainFieldsTags;
  };

  private readonly getExplodeFields = async (explodeMapKeys: MappingKey[], renameFn: RenameFn): Promise<Tags> => {
    let explodeFieldsTags: Tags = {};
    const explodeLookupKeys = explodeMapKeys.map((key) => key.lookupKey);

    const explodeFields = await this.domainFieldsRepo.getFields(explodeLookupKeys);

    // for each explode field parse for new Object.
    explodeFields.forEach((jsonString, index) => {
      if (jsonString === null) {
        this.logger.error({ msg: 'failed to fetch json for explode key', key: explodeLookupKeys[index] });
        throw new KeyNotFoundError(`failed to fetch json for key: ${explodeLookupKeys[index]}`);
      }

      try {
        const json = JSON.parse(jsonString) as Record<string, string | number | null>;
        const explodedFields = Object.entries(json).reduce((acc: Tags, [key, value]) => {
          const explodedKey = renameFn(key);
          acc[explodedKey] = value !== null ? value.toString() : null;

          return acc;
        }, {});

        explodeFieldsTags = { ...explodeFieldsTags, ...explodedFields };
      } catch (error) {
        this.logger.error({ msg: 'failed to parse json for explode key', err: error, key: explodeLookupKeys[index] });
        throw new JSONSyntaxError(`failed to parse fetched json for key: ${explodeLookupKeys[index]}`);
      }
    });

    return explodeFieldsTags;
  };
}
