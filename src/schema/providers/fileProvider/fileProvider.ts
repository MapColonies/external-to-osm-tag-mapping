import { promises as fsp } from 'fs';
import { inject, injectable } from 'tsyringe';
import { SERVICES } from '../../../common/constants';
import { IConfig } from '../../../common/interfaces';
import { ISchemaProvider } from '../provider';
import { Schema } from '../../models/types';
import { parseSchema } from '../../utils/schemaParser';

@injectable()
export class FileSchemaProvider implements ISchemaProvider {
  public constructor(@inject(SERVICES.CONFIG) private readonly config: IConfig) {}
  public async loadSchemas(): Promise<Schema[]> {
    const schemasRaw = await fsp.readFile(this.config.get('schema.filePath'), 'utf-8');
    const schemas = parseSchema(schemasRaw);
    if (!schemas) {
      throw new Error('Schema could not be parsed');
    }

    return schemas;
  }
}
