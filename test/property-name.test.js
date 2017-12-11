const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema

describe('#propertyName()', () => {
  test('returns name when available', () => {
    const schema = createContactSchema()
    schema.propertyName('name').should.equal('Full Name')
  })

  test('returns converted name', () => {
    const schema = createContactSchema()
    schema.propertyName('age').should.eql('Age')
  })

  test('throws error on unspecified property', () => {
    const schema = createContactSchema()
    const propertyName = 'Wobble';

    ((() => {
      schema.propertyName(propertyName)
    })).should.throwError(`No property '${propertyName}' in schema`)
  })
})
