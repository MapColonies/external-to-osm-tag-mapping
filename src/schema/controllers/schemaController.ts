import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SchemaManager } from '../models/schemaManager';
import { Schema, Tags } from '../models/mapping';
import { HttpError } from '../../common/middlewares/ErrorHandler';

interface SchemaParams {
  name: string;
}
interface SchemaParams {
  name: string;
}

type ErrorMessage = Record<string, string>;
type GetSchemasHandler = RequestHandler<SchemaParams, Schema[] | ErrorMessage>;
type GetSchemaHandler = RequestHandler<SchemaParams, Schema | ErrorMessage>;
type PostMapHandler = RequestHandler<SchemaParams, Tags, ErrorMessage>;

@injectable()
export class SchemaController {
  public constructor(@inject(SchemaManager) private readonly manager: SchemaManager) {}

  public getSchemas: GetSchemasHandler = async (req, res, next) => {
    const schemas = await this.manager.getSchemas();
    res.status(httpStatus.OK).json(schemas);
    return;
  };

  public getSchema: GetSchemaHandler = async (req, res, next) => {
    const { name } = req.params;
    const schema = await this.manager.getSchema(name);

    if (!schema) {
      const err: HttpError = new Error(`system ${name} not found`);
      err.status = httpStatus.NOT_FOUND;
      return next(err);
    }
    return res.status(httpStatus.OK).json(schema);
  };

  public postMap: PostMapHandler = async (req, res) => {
    const { body: tags } = req;
    const { name } = req.params;

    const map = await this.manager.map(name, tags);

    return res.status(httpStatus.OK).json(map);
  };
}
