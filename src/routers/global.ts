import { Router } from 'express';
import { helloWorldRouter } from './helloWorld';
import { swaggerRouter } from './swagger';

const globalRouter = Router();
globalRouter.use(swaggerRouter);
globalRouter.use('/helloWorld', helloWorldRouter);

export { globalRouter };
