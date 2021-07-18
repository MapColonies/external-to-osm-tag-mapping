import { promises as fsp } from 'fs';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../../common/constants';
import { IConfig } from '../../../common/interfaces';
import { ISchemaProvider } from '../provider';
import { Schema } from '../../models/types';
import { parseSchema } from '../../utils/schemaParser';

export type Tags = Record<string, unknown>;

@injectable()
export class FileSchemaProvider implements ISchemaProvider {
  public constructor(@inject(Services.CONFIG) private readonly config: IConfig) {}
  public async loadSchemas(): Promise<Schema[]> {
    const schemasRaw = await fsp.readFile(this.config.get('schema.filePath'), 'utf-8');
    const schemas = parseSchema(schemasRaw);
    if (!schemas) {
      throw new Error('Schema could not be parsed');
    }

    return schemas;
  }
}
