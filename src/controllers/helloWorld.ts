import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { injectable } from 'tsyringe';

@injectable()
export class HelloWorldController {
  public get(req: Request, res: Response, next: NextFunction): Response | void {
    try {
      return res.status(httpStatus.OK).json({ hello: 'world' });
    } catch (error) {
      return next(error);
    }
  }
}
