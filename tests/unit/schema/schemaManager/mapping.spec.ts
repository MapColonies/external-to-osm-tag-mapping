import { IConfig } from '../../../../src/common/interfaces';
import { Schemas } from '../../../../src/schema/models/mapping';

describe('Schema', function () {
  let config: IConfig;
  let configGetMock: jest.Mock;

  beforeAll(() => {
    configGetMock = jest.fn();
    config = { get: configGetMock, has: jest.fn() };
  });
  beforeEach(() => {
    configGetMock.mockReturnValue('avi');
  });
  describe('#getSchemas', function () {
    it('should return avi hard-coded schema - temporary test', async function () {
      const schema = new Schemas(config);
      const expected = [
        {
          name: 'avi',
          createdAt: '2020-12-20T13:32:25Z',
          updatedAt: '2020-12-20T13:32:25Z',
          mapping: {},
        },
      ];
      const schemaMapping = await schema.getSchemas();
      expect(schemaMapping).toEqual(expected);
    });
  });
  describe('#getSchema', function () {
    it('should return undefined', async function () {
      const schema = new Schemas(config);
      const schemaMapping = await schema.getSchema('some_schema_name');
      expect(schemaMapping).toBeUndefined();
    });
  });
});
