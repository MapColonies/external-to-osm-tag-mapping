import { Router } from 'express';
import { container } from 'tsyringe';
import { validate } from 'openapi-validator-middleware';
import { HelloWorldController } from '../controllers/helloWorld';

const helloWorldRouter = Router();
const controller = container.resolve(HelloWorldController);

helloWorldRouter.get('/', validate, controller.get.bind(controller));

export { helloWorldRouter };
