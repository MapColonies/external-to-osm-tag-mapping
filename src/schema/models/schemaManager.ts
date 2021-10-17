import { inject, injectable } from 'tsyringe';
import { IDomainFieldsRepository, IDOMAIN_FIELDS_REPO_SYMBOL } from '../DAL/domainFieldsRepository';
import { Tags } from '../providers/fileProvider/fileProvider';
import { SEPARATOR } from '../../common/constants';
import { Schema, schemaSymbol } from './types';

interface SchemaMetadataBase {
  keyIgnoreSets: Set<string>;
  addSchemaPrefix: boolean;
}

interface WithExternalFetch extends SchemaMetadataBase {
  enableExternalFetch: true;
  explodeKeysSet: Set<string>;
  domainFieldsListKey: string;
}

interface WithoutExternalFetch extends SchemaMetadataBase {
  enableExternalFetch: false;
}

type SchemaMetadata = WithExternalFetch | WithoutExternalFetch;

export class SchemaNotFoundError extends Error {}

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
      };

      if (curr.enableExternalFetch === 'yes') {
        schemaMetadata = {
          ...schemaMetadata,
          enableExternalFetch: true,
          explodeKeysSet: new Set(curr.explodeKeys),
          domainFieldsListKey: curr.domainFieldsListKey,
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
    const redisKeysArr: string[] = []; //array to hold all domainFields keys for redis request
    const explodeKeysArr: string[] = []; ///array to hold all explode keys for redis request
    let domainFields: Set<string>;

    if (schema.enableExternalFetch) {
      domainFields = await this.domainFieldsRepo.getDomainFieldsList(schema.domainFieldsListKey);
    }

    let finalTagsObj: Tags = Object.entries(tags).reduce((acc, [key, value]) => {
      //remove tag if it's an ignored key
      if (schema.keyIgnoreSets.has(key)) {
        return acc;
      }
      if (!schema.enableExternalFetch) {
        //add system name prefix
        return { ...acc, [this.concatenateKeysPrefix(name, key)]: value };
      }
      //check each tag if it's an explode field and put it in explodeKeysArr
      if (schema.explodeKeysSet.has(key) && value !== null) {
        explodeKeysArr.push(value.toString());
      }
      //check each tag if it's a domain field and put it in redisKeysArr
      if (domainFields.has(key.toUpperCase()) && value !== null) {
        redisKeysArr.push(`${key.toUpperCase()}:${value.toString()}`);
      }
      return { ...acc, [this.concatenateKeysPrefix(name, key)]: value };
    }, {});

    let domainFieldsKeys = {};
    let explodeFieldsKeys = {};

    if (redisKeysArr.length > 0) {
      domainFieldsKeys = await this.getDomainFields(redisKeysArr, name);
    }
    if (explodeKeysArr.length > 0) {
      explodeFieldsKeys = await this.getExplodeFields(explodeKeysArr, name);
    }
    finalTagsObj = { ...finalTagsObj, ...domainFieldsKeys, ...explodeFieldsKeys };
    return finalTagsObj;
  }

  private readonly concatenateKeysPrefix = (prefix: string, ...keys: string[]): string => {
    return this.schemas[prefix].addSchemaPrefix ? `${[prefix, ...keys].join(SEPARATOR)}` : keys[0];
  };

  private readonly getDomainFields = async (redisKeysArr: string[], name: string): Promise<Tags> => {
    let domainFieldsTags: Tags = {};
    const redisRes = await this.domainFieldsRepo.getFields(redisKeysArr);

    //for each domain field create new domain field tag with the correct value
    redisRes.forEach((key, index) => {
      domainFieldsTags = {
        ...domainFieldsTags,
        [this.concatenateKeysPrefix(name, redisKeysArr[index].split(':')[0], 'DOMAIN')]: key,
      };
    });
    return domainFieldsTags;
  };

  private readonly getExplodeFields = async (explodeKeysArr: string[], name: string): Promise<Tags> => {
    let explodeFieldsTags: Tags = {};
    const redisRes = await this.domainFieldsRepo.getFields(explodeKeysArr);

    //for each domain field parse for new Object and add prefix.
    redisRes.forEach((key) => {
      let explode = JSON.parse(key) as Record<string, string | number | null>;
      explode = Object.entries(explode).reduce((acc, [key, value]) => {
        return { ...acc, [this.concatenateKeysPrefix(name, key)]: value };
      }, {});
      explodeFieldsTags = { ...explodeFieldsTags, ...explode };
    });
    return explodeFieldsTags;
  };
}
