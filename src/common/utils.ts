import { camelCase } from 'lodash';
import { CamelCasedProperties } from 'type-fest';

export const convertObjectToCamelCase = <T extends Record<string, unknown>>(obj: T): CamelCasedProperties<T> => {
  const keyValues = Object.entries(obj);

  let camelCasedObject = {};

  for (const [key, value] of keyValues) {
    camelCasedObject = { ...camelCasedObject, [camelCase(key)]: value };
  }

  return camelCasedObject as CamelCasedProperties<T>;
};
