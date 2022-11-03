import { Logger } from '@map-colonies/js-logger';
import Redis from 'ioredis';
import { inject, injectable } from 'tsyringe';
import { REDIS_SYMBOL, SERVICES } from '../../common/constants';
import { IApplication } from '../../common/interfaces';
import { IDomainFieldsRepository } from './domainFieldsRepository';

@injectable()
export class RedisManager implements IDomainFieldsRepository {
  public getData: (keys: string[]) => Promise<(string | null)[]>;
  private readonly isHashGetter: boolean = false;

  public constructor(
    @inject(REDIS_SYMBOL) private readonly redis: Redis,
    @inject(SERVICES.APPLICATION) appConfig: IApplication,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {
    const { enabled, value } = appConfig.hashKey;
    if (enabled && value !== undefined) {
      this.isHashGetter = true;

      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redis.hmget(value, ...fields);
      };
    } else {
      this.getData = async (fields: string[]): Promise<(string | null)[]> => {
        return this.redis.mget(fields);
      };
    }
  }

  public async getFields(keys: string[]): Promise<(string | null)[]> {
    this.logger.debug({ msg: 'getting keys from redis', keysCount: keys.length, isHashGetter: this.isHashGetter });

    try {
      return await this.getData(keys);
    } catch (err) {
      this.logger.error({ msg: `failure in getting keys from redis`, err, keysCount: keys.length, isHashGetter: this.isHashGetter });
      throw err;
    }
  }
}
