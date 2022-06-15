import { Redis } from 'ioredis';
import { inject, injectable } from 'tsyringe';
import { REDIS_SYMBOL, SERVICES } from '../../common/constants';
import { IApplication } from '../../common/interfaces';
import { IDomainFieldsRepository } from './domainFieldsRepository';

@injectable()
export class RedisManager implements IDomainFieldsRepository {
  public getData: (fields: string[]) => Promise<(string | null)[]>;

  public constructor(@inject(REDIS_SYMBOL) private readonly redis: Redis, @inject(SERVICES.APPLICATION) appConfig: IApplication) {
    const { enabled, value } = appConfig.hashKey;
    if (enabled && value !== undefined) {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redis.hmget(value, ...fields);
      };
    } else {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redis.mget(fields);
      };
    }
  }

  public async getFields(fields: string[]): Promise<(string | null)[]> {
    try {
      return await this.getData(fields);
    } catch (e) {
      throw new Error('redis: failed to fetch keys');
    }
  }
}
