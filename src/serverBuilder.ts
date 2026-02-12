import express, { Router } from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { Logger } from '@map-colonies/js-logger';
import httpLogger from '@map-colonies/express-access-log-middleware';
import { OpenapiViewerRouter } from '@map-colonies/openapi-express-viewer';
import { inject, injectable } from 'tsyringe';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { getTraceContexHeaderMiddleware } from '@map-colonies/telemetry';
import { Registry } from 'prom-client';
import { collectMetricsExpressMiddleware } from '@map-colonies/telemetry/prom-metrics';
import { SCHEMA_ROUTER_SYMBOL } from './schema/routers/schemaRouter';
import { SERVICES } from './common/constants';
import { IConfig } from './common/interfaces';

@injectable()
export class ServerBuilder {
  private readonly serverInstance = express();
  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SCHEMA_ROUTER_SYMBOL) private readonly schemaRouter: Router
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
    this.serverInstance.use(collectMetricsExpressMiddleware({ registry: this.metricsRegistry }));

    this.serverInstance.use(httpLogger({ logger: this.logger }));
    if (this.config.get<boolean>('server.response.compression.enabled')) {
      this.serverInstance.use(compression(this.config.get<compression.CompressionFilter>('server.response.compression.options')));
    }
    this.serverInstance.use(bodyParser.json(this.config.get('server.request.payload')));
    this.serverInstance.use(getTraceContexHeaderMiddleware());

    const ignorePathRegex = new RegExp(`^${this.config.get<string>('openapiConfig.basePath')}/.*`, 'i');
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));
  }

  private buildRoutes(): void {
    this.buildDocsRoutes();
    this.serverInstance.use('/schemas', this.schemaRouter);
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter({
      ...this.config.get('openapiConfig'),
      filePathOrSpec: this.config.get<string>('openapiConfig.filePath'),
    });
    openapiRouter.setup();
    this.serverInstance.use(this.config.get<string>('openapiConfig.basePath'), openapiRouter.getRouter());
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware());
  }
}
