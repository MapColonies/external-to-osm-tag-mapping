import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HttpError } from '@map-colonies/error-express-handler';
import { Feature, Geometry } from 'geojson';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../../common/constants';
import { JSONSyntaxError, SchemaManager, SchemaNotFoundError } from '../models/schemaManager';
import { Tags } from '../../common/types';
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
  public constructor(
    @inject(SchemaManager) private readonly manager: SchemaManager,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {}

  public getSchemas: GetSchemasHandler = (req, res) => {
    const schemas = this.manager.getSchemas();
    return res.status(httpStatus.OK).json(schemas);
  };

  public getSchema: GetSchemaHandler = (req, res, next) => {
    const { name } = req.params;
    const schema = this.manager.getSchema(name);

    if (!schema) {
      this.logger.error({ msg: 'schema not found', schemaName: name });

      const error: HttpError = new Error(`schema ${name} not found`);
      error.statusCode = httpStatus.NOT_FOUND;

      return next(error);
    }
    return res.status(httpStatus.OK).json(schema);
  };

  public postMap: PostMapHandler = async (req, res, next) => {
    const tags = req.body.properties;
    const { name } = req.params;
    const response: ExternalFeature = { ...req.body };

    try {
      response.properties = await this.manager.map(name, tags);
    } catch (error) {
      if (error instanceof SchemaNotFoundError) {
        (error as HttpError).statusCode = httpStatus.NOT_FOUND;
      }
      if (error instanceof JSONSyntaxError || error instanceof KeyNotFoundError) {
        (error as HttpError).statusCode = httpStatus.UNPROCESSABLE_ENTITY;
      }
      return next(error);
    }
    return res.status(httpStatus.OK).json(response);
  };
}
