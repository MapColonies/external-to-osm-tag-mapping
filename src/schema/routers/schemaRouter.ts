import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { SchemaController } from '../controllers/schemaController';

const schemaRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(SchemaController);

  router.get('/', controller.getSchemas.bind(controller));
  router.get('/:name', controller.getSchema);
  router.post('/:name/map', controller.postMap);

  return router;
};

export { schemaRouterFactory };
