import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { SchemaController } from '../controllers/schemaController';

export const SCHEMA_ROUTER_SYMBOL = Symbol('schemaRouter');

export const schemaRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(SchemaController);

  router.get('/', controller.getSchemas);
  router.get('/:name', controller.getSchema);
  router.post('/:name/map', controller.postMap);

  return router;
};
