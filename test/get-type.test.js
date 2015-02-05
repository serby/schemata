var getType = require('../lib/get-type')
  , schemata = require('../')
  , assert = require('assert')

describe('#getType()', function () {
  it('should return type if it is a not a function', function () {
    var type = 'string'
    assert.equal(getType(type), type)
  })

  it('should return type if it is a schemata instance', function () {
    var schema = schemata()
    assert.equal(getType(schema), schema)
  })

  it('should call the function with the model if provided', function () {
    var model = { a: 1 }
      , schema = schemata()

    assert.deepEqual(getType(function (m) {
      assert.deepEqual(m, model)
      return schema
    }, model), schema)
  })

  it('should return the original argument if the value returned is not a schemata instance', function () {
    assert.equal(getType(Object), Object)
  })
})
