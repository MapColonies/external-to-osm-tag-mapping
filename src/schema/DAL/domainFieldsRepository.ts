export const IDOMAIN_FIELDS_REPO_SYMBOL = Symbol('DomainFieldsRepository');

export interface IDomainFieldsRepository {
  getFields: (fields: string[]) => Promise<(string | null)[]>;
}
