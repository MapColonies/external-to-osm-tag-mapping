import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HttpError } from '@map-colonies/error-express-handler';
import { SchemaManager } from '../models/schemaManager';
import { Schema, Tags } from '../models/mapping';

interface SchemaParams {
  name: string;
}

type GetSchemasHandler = RequestHandler<SchemaParams, Schema[]>;
type GetSchemaHandler = RequestHandler<SchemaParams, Schema>;
type PostMapHandler = RequestHandler<SchemaParams, Tags, Tags>;

@injectable()
export class SchemaController {
  public constructor(@inject(SchemaManager) private readonly manager: SchemaManager) {}

  public getSchemas: GetSchemasHandler = async (req, res) => {
    const schemas = await this.manager.getSchemas();
    res.status(httpStatus.OK).json(schemas);
    return;
  };

  public getSchema: GetSchemaHandler = async (req, res, next) => {
    const { name } = req.params;
    const schema = await this.manager.getSchema(name);

    if (!schema) {
      const err: HttpError = new Error(`system ${name} not found`);
      err.statusCode = httpStatus.NOT_FOUND;
      return next(err);
    }
    return res.status(httpStatus.OK).json(schema);
  };

  public postMap: PostMapHandler = async (req, res, next) => {
    const tags = req.body;
    const { name } = req.params;
    const schema = await this.manager.getSchema(name);

    if (!schema) {
      const err: HttpError = new Error(`system ${name} not found`);
      err.statusCode = httpStatus.NOT_FOUND;
      return next(err);
    }

    const map = await this.manager.map(name, tags);

    return res.status(httpStatus.OK).json(map);
  };
}
