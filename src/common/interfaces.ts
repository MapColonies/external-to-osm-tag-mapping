export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface IApplication {
  hashKey?: string;
}

export interface Constructor<T> {
  // a catch all constructor should be any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
}
export interface SwaggerConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}
