import { readPackageSync } from 'read-pkg';
import { hostname } from 'os';

export const SERVICE_NAME = readPackageSync().name;
export const HOSTNAME = hostname();
export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

/* eslint-disable @typescript-eslint/naming-convention */
export const SERVICES: Record<string, symbol> = {
  HEALTHCHECK: Symbol('healthcheck'),
  LOGGER: Symbol('LOGGER'),
  CONFIG: Symbol('CONFIG'),
  TRACER: Symbol('TRACER'),
  METER: Symbol('METER'),
};
/* eslint-enable @typescript-eslint/naming-convention */

export const REDIS_SYMBOL = Symbol('REDIS');
export const ON_SIGNAL = Symbol('onSignal');
