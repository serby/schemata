const schemata = require('../schemata')
const isSchemata = require('../lib/is-schemata')
const assert = require('assert')

describe('#isSchemata()', () => {
  test('should return true if it is a schemata object', () => {
    const person = schemata({ name: 'Person' })
    assert.strictEqual(isSchemata(person), true)
  })

  test('should return false if it is not a schemata object', () => {
    assert.strictEqual(isSchemata({ hello() {} }), false)
  })

  test('should return false if it is not an object', () => {
    assert.strictEqual(isSchemata('hello'), false)
  })
})
