import camelCase from 'camelcase';
import { snakeCase } from 'lodash';
import { CamelCasedProperties, SnakeCasedProperties } from 'type-fest';

export const convertObjectToCamelCase = <T extends Record<string, unknown>>(obj: T): CamelCasedProperties<T> => {
  const keyValues = Object.entries(obj);

  let camelCasedObject = {};

  for (const [key, value] of keyValues) {
    camelCasedObject = { ...camelCasedObject, [camelCase(key)]: value };
  }

  return camelCasedObject as CamelCasedProperties<T>;
};

export const convertObjectToSnakeCase = <T extends Record<string, unknown>>(obj: T): SnakeCasedProperties<T> => {
  const keyValues = Object.entries(obj);

  let snakeCasedObject = {};

  for (const [key, value] of keyValues) {
    snakeCasedObject = { ...snakeCasedObject, [snakeCase(key)]: value };
  }

  return snakeCasedObject as SnakeCasedProperties<T>;
};
