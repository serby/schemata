const assert = require('assert')
const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema

describe('#propertyName()', () => {
  it('returns name when available', () => {
    const schema = createContactSchema()
    assert.strictEqual(schema.propertyName('name'), 'Full Name')
  })

  it('returns converted name', () => {
    const schema = createContactSchema()
    assert.strictEqual(schema.propertyName('age'), 'Age')
  })

  it('throws error on unspecified property', () => {
    const schema = createContactSchema()
    const propertyName = 'Wobble'

    assert.throws(
      () => {
        schema.propertyName(propertyName)
      },
      { message: `No property '${propertyName}' in schema` }
    )
  })
})
