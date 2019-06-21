const getType = require('../lib/type-getter')
const schemata = require('../schemata')
const assert = require('assert')

describe('#getType()', () => {
  test('should return type if it is a not a function', () => {
    const type = 'string'
    assert.strictEqual(getType(type), type)
  })

  test('should return type if it is a schemata instance', () => {
    const schema = schemata({ name: 'Person' })
    assert.strictEqual(getType(schema), schema)
  })

  test('should call the function with the model if provided', () => {
    const model = { a: 1 }
    const schema = schemata({ name: 'Person' })
    const type = m => {
      assert.deepStrictEqual(m, model)
      return schema
    }
    assert.deepStrictEqual(getType(type, model), schema)
  })

  test('should return the original argument if the value returned is not a schemata instance', () => {
    assert.strictEqual(getType(Object), Object)
  })
})
