import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HttpError } from '@map-colonies/error-express-handler';
import { Feature, Geometry } from 'geojson';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../../common/constants';
import { JSONSyntaxError, SchemaManager, SchemaNotFoundError } from '../models/schemaManager';
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
  public constructor(@inject(SchemaManager) private readonly manager: SchemaManager, @inject(SERVICES.LOGGER) private readonly logger: Logger) {}

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
    const response: ExternalFeature = { ...req.body };

    try {
      response.properties = await this.manager.map(name, tags);
    } catch (e) {
      if (!(e instanceof Error)) {
        return next(new Error('Unexpected object thrown'));
      }
      this.logger.error({}, e.message);
      const httpError: HttpError = new Error(e.message);
      httpError.statusCode = httpStatus.INTERNAL_SERVER_ERROR;
      if (e instanceof SchemaNotFoundError) {
        httpError.statusCode = httpStatus.NOT_FOUND;
      }
      if (e instanceof KeyNotFoundError || e instanceof JSONSyntaxError) {
        httpError.statusCode = httpStatus.UNPROCESSABLE_ENTITY;
      }
      return next(httpError);
    }
    return res.status(httpStatus.OK).json(response);
  };
}
