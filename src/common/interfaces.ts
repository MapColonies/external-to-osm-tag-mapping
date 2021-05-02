export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface SwaggerConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}
