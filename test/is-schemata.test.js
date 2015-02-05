var isSchemata = require('../lib/is-schemata')
  , schemata = require('../schemata')
  , assert = require('assert')

describe('#isSchemata()', function () {
  it('should return true if it is a schemata object', function () {
    assert.equal(isSchemata(schemata()), true)
  })

  it('should return false if it is not a schemata object', function () {
    assert.equal(isSchemata({ hello: function () {} }), false)
  })

  it('should return false if it is not an object', function () {
    assert.equal(isSchemata('hello'), false)
  })
})
