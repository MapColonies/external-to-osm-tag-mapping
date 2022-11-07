import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { HttpError } from '@map-colonies/error-express-handler';
import { Feature, Geometry } from 'geojson';
import { Logger } from '@map-colonies/js-logger';
import { SnakeCasedProperties } from 'type-fest';
import { SERVICES } from '../../common/constants';
import { SchemaManager } from '../models/schemaManager';
import { MappingDebug, Schema, Tags } from '../models/types';
import { JSONSyntaxError, KeyNotFoundError, SchemaNotFoundError } from '../../common/errors';
import { convertObjectToCamelCase } from '../../common/utils';

interface SchemaParams {
  name: string;
}

type MapQueryParams = SnakeCasedProperties<{ shouldDebug: boolean }>;

type ExternalFeature = Feature<Geometry, Tags>;
type GetSchemasHandler = RequestHandler<SchemaParams, Schema[]>;
type GetSchemaHandler = RequestHandler<SchemaParams, Schema>;
type PostMapHandler = RequestHandler<SchemaParams, ExternalFeature & { debug?: MappingDebug[] }, ExternalFeature, MapQueryParams>;

@injectable()
export class SchemaController {
  public constructor(@inject(SchemaManager) private readonly manager: SchemaManager, @inject(SERVICES.LOGGER) private readonly logger: Logger) {}

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
    const queryParams = convertObjectToCamelCase(req.query);

    try {
      const { tags: properties, debug: debugResult } = await this.manager.map(name, tags, queryParams.shouldDebug);
      return res.status(httpStatus.OK).json({ ...req.body, properties, debug: debugResult });
    } catch (error) {
      if (error instanceof SchemaNotFoundError) {
        (error as HttpError).statusCode = httpStatus.NOT_FOUND;
      }
      if (error instanceof JSONSyntaxError || error instanceof KeyNotFoundError) {
        (error as HttpError).statusCode = httpStatus.UNPROCESSABLE_ENTITY;
      }
      return next(error);
    }
  };
}
