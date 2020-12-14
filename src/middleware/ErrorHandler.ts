import { MCLogger } from '@map-colonies/mc-logger';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { injectable } from 'tsyringe';
import { InputValidationError } from 'openapi-validator-middleware';
import HttpStatus from 'http-status-codes';

@injectable()
export class ErrorHandler {
  public constructor(private readonly logger: MCLogger) {}

  public getErrorHandlerMiddleware(): ErrorRequestHandler {
    return (
      err: Error,
      req: Request,
      res: Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      next: NextFunction
    ): void => {
      if (err instanceof InputValidationError) {
        res.status(HttpStatus.BAD_REQUEST).json(err.errors);
      } else {
        this.logger.error(
          `${req.method} request to ${req.originalUrl}  has failed with error: ${err.message}`
        );
        if (process.env.NODE_ENV === 'development') {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: err.message,
            stack: err.stack,
          });
        } else {
          res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    };
  }
}
