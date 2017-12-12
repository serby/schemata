const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema

describe('#propertyName()', () => {
  test('returns name when available', () => {
    const schema = createContactSchema()
    expect(schema.propertyName('name')).toBe('Full Name')
  })

  test('returns converted name', () => {
    const schema = createContactSchema()
    expect(schema.propertyName('age')).toEqual('Age')
  })

  test('throws error on unspecified property', () => {
    const schema = createContactSchema()
    const propertyName = 'Wobble'

    expect(() => {
      schema.propertyName(propertyName)
    }).toThrow(`No property '${propertyName}' in schema`)
  })
})
