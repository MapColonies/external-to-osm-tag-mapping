import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HttpError } from '@map-colonies/error-express-handler';
import { Feature, Geometry } from 'geojson';
import { SchemaManager } from '../models/schemaManager';
import { Tags } from '../providers/fileProvider/fileProvider';
import { Schema } from '../models/types';
import { KeyNotFoundError } from '../DAL/errors';

interface SchemaParams {
  name: string;
}

type ExternalFeature = Feature<Geometry, Tags>;
type GetSchemasHandler = RequestHandler<SchemaParams, Schema[]>;
type GetSchemaHandler = RequestHandler<SchemaParams, Schema>;
type PostMapHandler = RequestHandler<SchemaParams, ExternalFeature, ExternalFeature>;

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

  public postMap: PostMapHandler = async (req, res, next) => {
    const tags = req.body.properties;
    const { name } = req.params;
    const schema = this.manager.getSchema(name);

    if (!schema) {
      const err: HttpError = new Error(`system ${name} not found`);
      err.statusCode = httpStatus.NOT_FOUND;
      return next(err);
    }

    try {
      req.body.properties = await this.manager.map(name, tags);
    } catch (e) {
      if (e instanceof KeyNotFoundError) {
        (e as HttpError).status = httpStatus.UNPROCESSABLE_ENTITY;
      }
      return next(e);
    }
    return res.status(httpStatus.OK).json(req.body);
  };
}
