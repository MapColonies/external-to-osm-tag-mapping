export const IDOMAIN_FIELDS_REPO_SYMBOL = Symbol('DOMAINFIELDSREPO');

export interface IDomainFieldsRepository {
  getFields: (fields: string[]) => Promise<string[]>;
  getDomainFieldsList: (domainFieldsListName: string) => Promise<Set<string>>;
}
