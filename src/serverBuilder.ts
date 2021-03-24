import express from 'express';
import bodyParser from 'body-parser';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { OpenapiViewerRouter, OpenapiRouterConfig } from '@map-colonies/openapi-express-viewer';
import { container, inject, injectable } from 'tsyringe';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { RequestLogger } from './common/middlewares/RequestLogger';
import { schemaRouterFactory } from './schema/routers/schemaRouter';
import { IConfig, ILogger } from './common/interfaces';
import { Services } from './common/constants';

@injectable()
export class ServerBuilder {
  private readonly serverInstance = express();

  public constructor(
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly requestLogger: RequestLogger
  ) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(express.json(this.config.get<bodyParser.Options>('server.request.payload')));

    const ignorePathRegex = new RegExp(`^${this.config.get<string>('openapiConfig.basePath')}/.*`, 'i');
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));

    this.serverInstance.use(this.requestLogger.getLoggerMiddleware());
  }

  private buildRoutes(): void {
    this.buildDocsRoutes();
    this.serverInstance.use('/schemas', schemaRouterFactory(container));
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter(this.config.get<OpenapiRouterConfig>('openapiConfig'));
    openapiRouter.setup();
    this.serverInstance.use(this.config.get<string>('openapiConfig.basePath'), openapiRouter.getRouter());
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware((message) => this.logger.log('error', message)));
  }
}
