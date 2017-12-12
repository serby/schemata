const getType = require('../lib/get-type')
const schemata = require('../')
const assert = require('assert')

describe('#getType()', () => {
  test('should return type if it is a not a function', () => {
    const type = 'string'
    assert.equal(getType(type), type)
  })

  test('should return type if it is a schemata instance', () => {
    const schema = schemata()
    assert.equal(getType(schema), schema)
  })

  test('should call the function with the model if provided', () => {
    const model = { a: 1 }
    const schema = schemata()
    const type = m => {
      assert.deepEqual(m, model)
      return schema
    }
    assert.deepEqual(getType(type, model), schema)
  })

  test(
    'should return the original argument if the value returned is not a schemata instance',
    () => {
      assert.equal(getType(Object), Object)
    }
  )
})
