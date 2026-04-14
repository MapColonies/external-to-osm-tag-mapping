import redis from 'ioredis';
import { inject, injectable } from 'tsyringe';
import { type ConfigType } from '@src/common/config';
import { REDIS_SYMBOL, SERVICES } from '../../common/constants';
import { IDomainFieldsRepository } from './domainFieldsRepository';

@injectable()
export class RedisManager implements IDomainFieldsRepository {
  public getData: (fields: string[]) => Promise<(string | null)[]>;

  public constructor(
    @inject(REDIS_SYMBOL) public readonly redisInstance: redis,
    @inject(SERVICES.CONFIG) public readonly config: ConfigType
  ) {
    const appConfig = this.config.get('application');
    const { enabled, value } = appConfig.hashKey;
    if (enabled && value !== undefined) {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redisInstance.hmget(value, ...fields);
      };
    } else {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redisInstance.mget(fields);
      };
    }
  }

  public async getFields(fields: string[]): Promise<(string | null)[]> {
    try {
      const result = await this.getData(fields);
      return result;
    } catch (error) {
      console.error('GetFields error:', error);
      throw new Error('redis: failed to fetch keys ');
    }
  }
}
