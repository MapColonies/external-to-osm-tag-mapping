import { hostname } from 'os';
import { readFileSync } from 'fs';
import { PackageJson } from 'type-fest';

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync('./package.json', { encoding: 'utf-8' })) as PackageJson;
}

export const SERVICE_NAME = readPackageJson().name ?? 'unknown_service';
export const HOSTNAME = hostname();
export const DEFAULT_SERVER_PORT = 80;
export const REDIS_CONNECTION_ERROR_CODE = 1337;
export const DEFAULT_EXIT_CODE = 1;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

/* eslint-disable @typescript-eslint/naming-convention */
export const SERVICES: Record<string, symbol> = {
  HEALTHCHECK: Symbol('healthcheck'),
  LOGGER: Symbol('LOGGER'),
  CONFIG: Symbol('CONFIG'),
  TRACER: Symbol('TRACER'),
  METER: Symbol('METER'),
  APPLICATION: Symbol('APPLICATION'),
};
/* eslint-enable @typescript-eslint/naming-convention */

export const REDIS_SYMBOL = Symbol('REDIS');
export const ON_SIGNAL = Symbol('onSignal');

export const SEPARATOR = '_';
