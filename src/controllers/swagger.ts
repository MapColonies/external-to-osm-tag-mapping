import swaggerUi from 'swagger-ui-express';
import { get } from 'config';
import { MCLogger } from '@map-colonies/mc-logger';
import { Request, Response, RequestHandler } from 'express';
import { load } from 'yamljs';
import { injectable, delay, inject } from 'tsyringe';
import { config as initDotEnv } from 'dotenv';

interface SwaggerServer  { 
  [key: string]: unknown,
  url: string;
};

@injectable()
export class SwaggerController {
  public uiMiddleware: RequestHandler[];
  public serveUi: RequestHandler;

  private readonly swaggerDoc: swaggerUi.JsonObject;

  private readonly swaggerConfig: {
    jsonPath: string;
    uiPath: string;
  };

  public constructor(
    @inject(delay(() => MCLogger)) private readonly logger: MCLogger
  ) {
    this.swaggerConfig = get('swagger');
    // load swagger object from file
    this.swaggerDoc = load('./docs/openapi3.yaml') as swaggerUi.JsonObject;
    this.setSwaggerHost();
    this.serveUi = swaggerUi.setup(this.swaggerDoc);
    this.uiMiddleware = swaggerUi.serve;
  }

  public serveJson(req: Request, res: Response): void {
    res.json(this.swaggerDoc);
  }

  private setSwaggerHost(): void {
    initDotEnv();
    const host: string = process.env.HOST ?? 'http://localhost';
    const port: string = process.env.SERVER_PORT ?? '80';
    const servers = ((this.swaggerDoc.servers) as SwaggerServer[]);
    servers[0].url = `${host}:${port}`;
  }
}
