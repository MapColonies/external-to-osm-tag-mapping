import { inject, injectable } from 'tsyringe';
import { IDomainFieldsRepository, IDOMAIN_FIELDS_REPO_SYMBOL } from '../DAL/domainFieldsRepository';
import { Tags } from '../providers/fileProvider/fileProvider';
import { SEPARATOR } from '../../common/constants';
import { Schema, schemaSymbol } from './types';

interface SchemaMetadataBase {
  keyIgnoreSets: Set<string>;
  addSchemaPrefix: boolean;
  renameKeys?: Record<string, string>;
}

interface WithExternalFetch extends SchemaMetadataBase {
  enableExternalFetch: true;
  explodeKeysSet: Set<string>;
  domainFieldsListKey: string;
  defaultHashKey?: string;
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
          domainFieldsListKey: curr.domainFieldsListKey,
          ...(curr.defaultHashKey !== undefined && { defaultHashKey: curr.defaultHashKey }),
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
    const domainFieldsKeys: string[] = []; //array to hold all domainFields keys for domain repo request
    const explodeKeys: string[] = []; ///array to hold all explode keys for domain repo request
    let domainFields: Set<string>;
    let defaultHashKey: string | undefined;

    if (schema.enableExternalFetch) {
      domainFields = await this.domainFieldsRepo.getDomainFieldsList(schema.domainFieldsListKey);
      defaultHashKey = schema.defaultHashKey;
    }

    let finalTagsObj: Tags = Object.entries(tags).reduce((acc, [key, value]) => {
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
          explodeKeys.push(value.toString());
        }

        //check each tag if it's a domain field and put it in domainFieldsKeys
        if (domainFields.has(key.toUpperCase()) && value !== null) {
          domainFieldsKeys.push(`${key.toUpperCase()}:${value.toString()}`);
        }
      }

      return { ...acc, [key]: value };
    }, {});

    let mappedDomainFields = {};
    let explodeFieldsKeys = {};

    if (domainFieldsKeys.length > 0) {
      mappedDomainFields = await this.getDomainFieldsCodedValues(domainFieldsKeys, defaultHashKey);
    }

    if (explodeKeys.length > 0) {
      explodeFieldsKeys = await this.getExplodeFields(explodeKeys, defaultHashKey);
    }

    finalTagsObj = { ...finalTagsObj, ...mappedDomainFields, ...explodeFieldsKeys };

    if (this.schemas[name].addSchemaPrefix) {
      //for each key add a system name prefix
      finalTagsObj = Object.entries(finalTagsObj).reduce((acc, [key, value]) => {
        return { ...acc, [this.concatenateKeysPrefix(name, key)]: value };
      }, {});
    }

    return finalTagsObj;
  }

  private readonly concatenateKeysPrefix = (prefix: string, ...keys: string[]): string => {
    return `${[prefix, ...keys].join(SEPARATOR)}`;
  };

  private readonly getDomainFieldsCodedValues = async (domainFieldsKeys: string[], hashKey: string | undefined): Promise<Tags> => {
    let domainFieldsTags: Tags = {};
    const fieldsCodedValuesRes = await this.domainFieldsRepo.getFields(domainFieldsKeys, hashKey);

    //for each domain field create new domain field tag with the correct value
    fieldsCodedValuesRes.forEach((codedValue, index) => {
      domainFieldsTags = {
        ...domainFieldsTags,
        [domainFieldsKeys[index].split(':')[0]]: codedValue,
      };
    });

    return domainFieldsTags;
  };

  private readonly getExplodeFields = async (explodeKeys: string[], hashKey: string | undefined): Promise<Tags> => {
    let explodeFieldsTags: Tags = {};
    const explodeRes = await this.domainFieldsRepo.getFields(explodeKeys, hashKey);

    //for each domain field parse for new Object.
    explodeRes.forEach((json, index) => {
      try {
        let explode = JSON.parse(json) as Record<string, string | number | null>;
        explode = Object.entries(explode).reduce((acc, [key, value]) => {
          return { ...acc, [key]: value };
        }, {});
        explodeFieldsTags = { ...explodeFieldsTags, ...explode };
      } catch (error) {
        throw new JSONSyntaxError(`failed to parse fetched json for value: ${explodeKeys[index]}`);
      }
    });

    return explodeFieldsTags;
  };
}
