import { REDIS_KEYS_SEPARATOR } from '../../common/constants';

export const keyConstructor = (...vals: string[]): string => {
  return vals.filter((v) => v).join(REDIS_KEYS_SEPARATOR); // drop undefined, null and empty string from a key
};
