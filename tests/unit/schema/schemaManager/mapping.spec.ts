import { Schemas } from '../../../../src/schema/models/mapping';

describe('Schema', function() {
    describe('#getSchemas', function() {
        it('should return an empty array', async function() {
            const schema = new Schemas();
            const schemaMapping = await schema.getSchemas();
            expect(schemaMapping).toEqual([]);
        });
    });
    describe('#getSchema', function() {
        it('should return undefined', async function() {
            const schema = new Schemas();
            const schemaMapping = await schema.getSchema('some_schema_name');
            expect(schemaMapping).toBeUndefined();
        })
    });
});
