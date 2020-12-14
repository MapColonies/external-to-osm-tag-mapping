import express from 'express';
import { initAsync as validatorInit } from 'openapi-validator-middleware';
import { MCLogger } from '@map-colonies/mc-logger';
import { injectable } from 'tsyringe';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import { RequestLogger } from './middleware/RequestLogger';
import { ErrorHandler } from './middleware/ErrorHandler';
import { globalRouter } from './routers/global';

@injectable()
export class ServerBuilder {
  private readonly serverInstance = express();

  public constructor(
    private readonly logger: MCLogger,
    private readonly requestLogger: RequestLogger,
    private readonly errorHandler: ErrorHandler
  ) {
    this.serverInstance = express();
  }

  public async build(): Promise<express.Application> {
    // Initiate swagger validator
    await validatorInit('./docs/openapi3.yaml');

    this.registerMiddlewares();
    this.serverInstance.use(globalRouter);
    this.serverInstance.use(this.errorHandler.getErrorHandlerMiddleware());

    return this.serverInstance;
  }

  private registerMiddlewares(): void {
    this.serverInstance.use(cors());
    this.serverInstance.use(bodyParser.json());
    this.serverInstance.use(this.requestLogger.getLoggerMiddleware());
  }
}
