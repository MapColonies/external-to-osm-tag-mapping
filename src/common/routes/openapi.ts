import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { SwaggerController } from '../controllers/openapi';
import { Services } from '../constants';
import { IConfig, SwaggerConfig } from '../interfaces';

const swaggerRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const controller = dependencyContainer.resolve(SwaggerController);
  const config = dependencyContainer.resolve<IConfig>(Services.CONFIG);
  const openapiConfig = config.get<SwaggerConfig>('openapiConfig');

  const swaggerRouter = Router();

  const swaggerJsonPath = openapiConfig.basePath + openapiConfig.jsonPath;
  if (swaggerJsonPath && swaggerJsonPath !== '') {
    swaggerRouter.get(swaggerJsonPath, controller.serveJson.bind(controller));
  }

  const openapiUiPath = openapiConfig.basePath + openapiConfig.uiPath;
  swaggerRouter.use(openapiUiPath, controller.uiMiddleware, controller.serveUi);

  return swaggerRouter;
};

export { swaggerRouterFactory };
