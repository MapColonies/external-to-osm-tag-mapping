import { inject, injectable } from 'tsyringe';
import { IDomainFieldsRepository, IDOMAIN_FIELDS_REPO_SYMBOL } from '../DAL/domainFieldsRepository';
import { Tags } from '../providers/fileProvider/fileProvider';
import { KEYS_SEPARATOR, REDIS_KEYS_SEPARATOR } from '../../common/constants';
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
  public constructor(
    @inject(schemaSymbol) private readonly inputSchemas: Schema[],
    @inject(IDOMAIN_FIELDS_REPO_SYMBOL) private readonly domainFieldsRepo: IDomainFieldsRepository
  ) {
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
    return this.inputSchemas;
  }

  public getSchema(name: string): Schema | undefined {
    return this.inputSchemas.find((schema) => schema.name === name);
  }

  public async map(name: string, tags: Tags): Promise<Tags> {
    if (this.getSchema(name) === undefined) {
      throw new SchemaNotFoundError(`schema ${name} not found`);
    }
    const schema = this.schemas[name];
    const domainKeys: string[] = []; // array to hold all domain keys
    const explodeKeys: string[] = []; // array to hold all explode keys

    let finalTags: Tags = Object.entries(tags).reduce((acc, [key, value]) => {
      //remove tag if it's an ignored key
      if (schema.keyIgnoreSets.has(key)) {
        return acc;
      }

      //check if tag's key should be renamed
      if (schema.renameKeys && Object.prototype.hasOwnProperty.call(schema.renameKeys, key)) {
        key = schema.renameKeys[key];
      }

      if (schema.enableExternalFetch) {
        //check each tag if it's an explode field and put it in explodeKeys
        if (schema.explodeKeysSet.has(key) && value !== null) {
          explodeKeys.push(`${keyConstructor(schema.explodePrefix, key, value.toString())}`);
        } else if (value !== null) {
          domainKeys.push(`${keyConstructor(schema.domainPrefix, key.toUpperCase(), value.toString())}`);
        }
      }

      return { ...acc, [key]: value };
    }, {});

    let domainFieldsTags = {};
    let explodeFieldsTags = {};

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

    return finalTags;
  }

  private readonly concatenateKeysPrefix = (prefix: string, ...keys: string[]): string => {
    return `${[prefix, ...keys].join(KEYS_SEPARATOR)}`;
  };

  private readonly getDomainFieldsCodedValues = async (domainKeys: string[]): Promise<Tags> => {
    let domainFieldsTags: Tags = {};
    const fieldsCodedValues = await this.domainFieldsRepo.getFields(domainKeys);

    // for each domain field create new domain field tag with the correct value
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
        throw new KeyNotFoundError(`failed to fetch json for key: ${explodeKeys[index]}`);
      }

      try {
        const json = JSON.parse(jsonString) as Record<string, string | number | null>;
        const explodedFields = Object.entries(json).reduce((acc, [key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            return { ...acc, [key + '_DOMAIN']: value.toString() };
          } else {
            return acc;
          }
        }, {});
        explodeFieldsTags = { ...explodeFieldsTags, ...explodedFields };
      } catch (error) {
        throw new JSONSyntaxError(`failed to parse fetched json for key: ${explodeKeys[index]}`);
      }
    });

    return explodeFieldsTags;
  };
}
