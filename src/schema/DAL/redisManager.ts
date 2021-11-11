import { Redis } from 'ioredis';
import { inject, injectable } from 'tsyringe';
import { REDIS_SYMBOL } from '../../common/constants';
import { KeyNotFoundError } from './errors';
import { IDomainFieldsRepository } from './domainFieldsRepository';

@injectable()
export class RedisManager implements IDomainFieldsRepository {
  private readonly lrangeFromIdx: number;
  private readonly lrangeToIdx: number;

  public constructor(@inject(REDIS_SYMBOL) private readonly redis: Redis) {
    this.lrangeFromIdx = 0;
    this.lrangeToIdx = -1;
  }

  public async getFields(fields: string[], key: string | undefined): Promise<string[]>;
  public async getFields(fields: string[]): Promise<string[]>;
  public async getFields(fields: string[], key?: string): Promise<string[]> {
    let res: (string | null)[];
    try {
      res = key !== undefined ? await this.redis.hmget(key, fields) : await this.redis.mget(fields);
    } catch (e) {
      throw new Error('redis: failed to fetch keys');
    }

    if (!this.isArrayOfStrings(res)) {
      throw new KeyNotFoundError(`redis: one or more of those keys do not exist: ${fields.toString()}`);
    }

    return res;
  }

  public async getDomainFieldsList(domainFieldsListName: string): Promise<Set<string>> {
    try {
      const domainSet: Set<string> = new Set();
      const domainArr = await this.redis.lrange(domainFieldsListName, this.lrangeFromIdx, this.lrangeToIdx);
      domainArr.forEach((key) => domainSet.add(key.toUpperCase()));
      return domainSet;
    } catch (e) {
      throw new Error('redis: failed to fetch keys');
    }
  }

  private isArrayOfStrings(array: (string | null)[]): array is string[] {
    return array.every((item) => typeof item === 'string');
  }
}
