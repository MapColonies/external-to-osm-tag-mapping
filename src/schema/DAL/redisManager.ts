import { Redis } from 'ioredis';
import { inject, injectable } from 'tsyringe';
import { REDIS_SYMBOL, SERVICES } from '../../common/constants';
import { IApplication } from '../../common/interfaces';
import { KeyNotFoundError } from './errors';
import { IDomainFieldsRepository } from './domainFieldsRepository';

@injectable()
export class RedisManager implements IDomainFieldsRepository {
  public getData: (fields: string[]) => Promise<(string | null)[]>;
  private readonly lrangeFromIdx: number;
  private readonly lrangeToIdx: number;

  public constructor(@inject(REDIS_SYMBOL) private readonly redis: Redis, @inject(SERVICES.APPLICATION) appConfig: IApplication) {
    this.lrangeFromIdx = 0;
    this.lrangeToIdx = -1;
    const { enabled, value } = appConfig.hashKey;
    if (enabled && value !== undefined) {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redis.hmget(value, fields);
      };
    } else {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redis.mget(fields);
      };
    }
  }

  public async getFields(fields: string[]): Promise<string[]> {
    let res: (string | null)[];
    try {
      res = await this.getData(fields);
    } catch (e) {
      throw new Error('redis: failed to fetch keys');
    }

    if (!this.isArrayOfStrings(res)) {
      throw new KeyNotFoundError(`redis: one or more of those keys do not exist: ${fields.toString()}`);
    }

    return res;
  }

  public async getDomainFieldsList(domainFieldsListName: string): Promise<Set<string>> {
    let domainArr;
    const domainSet: Set<string> = new Set();
    try {
      domainArr = await this.redis.lrange(domainFieldsListName, this.lrangeFromIdx, this.lrangeToIdx);
    } catch (error) {
      throw new Error('redis: failed to fetch keys');
    }
    if (domainArr.length === 0) {
      throw new KeyNotFoundError(`redis: could not find a domain key with valid value: ${domainFieldsListName}`);
    }
    domainArr.forEach((key) => domainSet.add(key.toUpperCase()));
    return domainSet;
  }

  private isArrayOfStrings(array: (string | null)[]): array is string[] {
    return array.every((item) => typeof item === 'string');
  }
}
