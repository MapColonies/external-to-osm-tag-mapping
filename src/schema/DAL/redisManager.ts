import redis from 'ioredis';
import { inject, injectable } from 'tsyringe';
import { ConfigType } from '@src/common/config';
import { REDIS_SYMBOL, SERVICES } from '../../common/constants';
import { IDomainFieldsRepository } from './domainFieldsRepository';

@injectable()
export class RedisManager implements IDomainFieldsRepository {
  public getData: (fields: string[]) => Promise<(string | null)[]>;
  public getAll: () => Promise<Record<string, string>>;

  public constructor(
    @inject(REDIS_SYMBOL) public readonly redisInstance: redis,
    @inject(SERVICES.CONFIG) public readonly config: ConfigType
  ) {
    const appConfig = this.config.get('application');
    const { enabled, value } = appConfig.hashKey;
    if (enabled && value != null && value !== '') {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        const result = await this.redisInstance.hmget(value, ...fields);
        return result;
      };

      this.getAll = async (): Promise<Record<string, string>> => {
        await this.redisInstance.hset('kaki', { a: '1', b: '2' });
        return this.redisInstance.hgetall('hitelr');
      };
    } else {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        const result = await this.redisInstance.mget(fields);
        return result;
      };

      this.getAll = async (): Promise<Record<string, string>> => {
        const keys = await this.redisInstance.keys('*');

        if (keys.length === 0) {
          return {};
        }

        const values = await this.redisInstance.mget(keys);

        const result: Record<string, string> = {};

        keys.forEach((key, index) => {
          const value = values[index];
          if (value !== null) {
            result[key] = value;
          }
        });

        return result;
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

  public async getAllTable(): Promise<Record<string, string>> {
    try {
      const result = await this.getAll();
      return result;
    } catch (error) {
      console.error('GetFields error:', error);
      throw new Error('redis: failed to fetch keys ');
    }
  }
}
