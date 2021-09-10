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

  public async getFields(fields: string[]): Promise<string[]> {
    let res: (string | null)[];
    try {
      res = await this.redis.mget(fields);
    } catch (e) {
      throw new Error('redis: faild to fetch keys');
    }
    if (res.includes(null)) {
      throw new KeyNotFoundError(`one or more of those keys are not exists: ${fields.toString()}`);
    }
    return res as string[];
  }

  public async getDomainFieldsList(domainFieldsListName: string): Promise<Set<string>> {
    try {
      const domainSet: Set<string> = new Set();
      const doaminArr = await this.redis.lrange(domainFieldsListName, this.lrangeFromIdx, this.lrangeToIdx);
      doaminArr.forEach((key) => domainSet.add(key.toUpperCase()));
      return domainSet;
    } catch (e) {
      throw new Error('redis: faild to fetch keys');
    }
  }
}
