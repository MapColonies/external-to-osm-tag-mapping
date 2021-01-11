import express from 'express';
import bodyParser from 'body-parser';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { container, inject, injectable } from 'tsyringe';
import { RequestLogger } from './common/middlewares/RequestLogger';
import { ErrorHandler } from './common/middlewares/ErrorHandler';
import { schemaRouterFactory } from './schema/routers/schemaRouter';
import { swaggerRouterFactory } from './common/routes/swagger';
import { IConfig, ILogger } from './common/interfaces';
import { Services } from './common/constants';

@injectable()
export class ServerBuilder {
  private readonly serverInstance = express();

  public constructor(
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly requestLogger: RequestLogger,
    private readonly errorHandler: ErrorHandler
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
    this.serverInstance.use(bodyParser.json());
    const ignorePathRegex = new RegExp(`^${this.config.get<string>('swaggerConfig.basePath')}/.*`, 'i');
    this.serverInstance.use(
      OpenApiMiddleware({ apiSpec: this.config.get('swaggerConfig.filePath'), validateRequests: true, ignorePaths: ignorePathRegex })
    );
    this.serverInstance.use(this.requestLogger.getLoggerMiddleware());
  }

  private buildRoutes(): void {
    this.serverInstance.use('/schemas', schemaRouterFactory(container));
    this.serverInstance.use(swaggerRouterFactory(container));
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(this.errorHandler.getErrorHandlerMiddleware());
  }
}
