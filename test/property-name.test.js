const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema

describe('#propertyName()', () => {
  it('returns name when available', () => {
    const schema = createContactSchema()
    schema.propertyName('name').should.equal('Full Name')
  })

  it('returns converted name', () => {
    const schema = createContactSchema()
    schema.propertyName('age').should.eql('Age')
  })

  it('throws error on unspecified property', () => {
    const schema = createContactSchema()
    const propertyName = 'Wobble';

    ((() => {
      schema.propertyName(propertyName)
    })).should.throwError(`No property '${propertyName}' in schema`)
  })
})
