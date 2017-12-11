const isSchemata = require('../lib/is-schemata')
const schemata = require('../schemata')
const assert = require('assert')

describe('#isSchemata()', () => {
  it('should return true if it is a schemata object', () => {
    assert.equal(isSchemata(schemata()), true)
  })

  it('should return false if it is not a schemata object', () => {
    assert.equal(isSchemata({ hello () {} }), false)
  })

  it('should return false if it is not an object', () => {
    assert.equal(isSchemata('hello'), false)
  })
})
