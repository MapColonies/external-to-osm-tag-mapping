import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HttpError } from '@map-colonies/error-express-handler';
import { SchemaManager } from '../models/schemaManager';
import { Tags } from '../providers/fileProvider/fileProvider';
import { Schema } from '../models/types';

interface SchemaParams {
  name: string;
}

type GetSchemasHandler = RequestHandler<SchemaParams, Schema[]>;
type GetSchemaHandler = RequestHandler<SchemaParams, Schema>;
type PostMapHandler = RequestHandler<SchemaParams, Tags, Tags>;

@injectable()
export class SchemaController {
  public constructor(@inject(SchemaManager) private readonly manager: SchemaManager) {}

  public getSchemas: GetSchemasHandler = (req, res) => {
    const schemas = this.manager.getSchemas();
    res.status(httpStatus.OK).json(schemas);
    return;
  };

  public getSchema: GetSchemaHandler = (req, res, next) => {
    const { name } = req.params;
    const schema = this.manager.getSchema(name);

    if (!schema) {
      const err: HttpError = new Error(`system ${name} not found`);
      err.statusCode = httpStatus.NOT_FOUND;
      return next(err);
    }
    return res.status(httpStatus.OK).json(schema);
  };

  public postMap: PostMapHandler = (req, res, next) => {
    const tags = req.body.properties as Tags;
    const { name } = req.params;
    const schema = this.manager.getSchema(name);

    if (!schema) {
      const err: HttpError = new Error(`system ${name} not found`);
      err.statusCode = httpStatus.NOT_FOUND;
      return next(err);
    }

    const newGeoJson = req.body;
    newGeoJson['properties'] = this.manager.map(name, tags);

    return res.status(httpStatus.OK).json(newGeoJson);
  };
}
