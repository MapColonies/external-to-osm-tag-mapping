import redis from 'ioredis';
import { inject, injectable } from 'tsyringe';
import { ConfigType } from '@src/common/config';
import { REDIS_SYMBOL, SERVICES } from '../../common/constants';
import { IApplication } from '../../common/interfaces';
import { IDomainFieldsRepository } from './domainFieldsRepository';

@injectable()
export class RedisManager implements IDomainFieldsRepository {
  public getData: (fields: string[]) => Promise<(string | null)[]>;
  public getAll: () => Promise<Record<string, string>>;

  public constructor(
    @inject(REDIS_SYMBOL) public readonly redisInstance: redis,
    @inject(SERVICES.APPLICATION) public readonly appConfig: IApplication,
    @inject(SERVICES.CONFIG) public readonly config: ConfigType
  ) {
    const { enabled, value } = appConfig.hashKey;
    console.log('configga', this.config.get('application'));
    console.log('APPLICATIONIGGA', this.appConfig);
    // const {
    //   hashKey: { enabled, value },
    // } = this.config.get('application')!;
    if (enabled && value != null && value !== '') {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        const result = await this.redisInstance.hmget(value, ...fields);
        return result;
      };

      this.getAll = async (): Promise<Record<string, string>> => {
        console.log('kaki', value);
        await this.redisInstance.hset('kaki', { a: '1', b: '2' });
        console.log('hitler', await this.redisInstance.hgetall('someKey:hashKey1'));
        return this.redisInstance.hgetall('hitelr');
      };
    } else {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        console.log('HARA2', fields);
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
      if (fields.length > 0 && fields[0] == 'explode1:val4') {
        console.log('HARA', fields);
        console.log(this.appConfig);
      }
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
