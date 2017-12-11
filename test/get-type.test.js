const getType = require('../lib/get-type')
const schemata = require('../')
const assert = require('assert')

describe('#getType()', () => {
  it('should return type if it is a not a function', () => {
    const type = 'string'
    assert.equal(getType(type), type)
  })

  it('should return type if it is a schemata instance', () => {
    const schema = schemata()
    assert.equal(getType(schema), schema)
  })

  it('should call the function with the model if provided', () => {
    const model = { a: 1 }
    const schema = schemata()

    assert.deepEqual(getType(m => {
      assert.deepEqual(m, model)
      return schema
    }, model), schema)
  })

  it('should return the original argument if the value returned is not a schemata instance', () => {
    assert.equal(getType(Object), Object)
  })
})
