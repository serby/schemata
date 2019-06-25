const schemata = require('../schemata')
const assert = require('assert')

describe('#schema', () => {
  it('should throw if name is missing', () => {
    assert.throws(() => {
      schemata()
    }, /name is required/)
  })

  it('should not throw if properties are missing', () => {
    try {
      schemata({ name: 'Person' })
    } catch (e) {
      throw new Error('Empty properties should not error')
    }
  })

  it('should default to an empty schemata', () => {
    const empty = schemata({ name: 'Person' })
    assert.deepStrictEqual(empty.getProperties(), {})
  })

  it('should get schema name', () => {
    const schema = schemata({ name: 'Person', description: 'A real person' })
    assert.strictEqual(schema.getName(), 'Person')
  })

  it('should get schema description', () => {
    const schema = schemata({ name: 'Person', description: 'A real person' })
    assert.strictEqual(schema.getDescription(), 'A real person')
  })

  it('should throw an error if a defaultValue is neither a primitive value or a function', () => {
    const badSchemas = [
      { a: { defaultValue: [] } },
      { a: { defaultValue: {} } },
      { a: { defaultValue: new Date() } },
      { a: { defaultValue: 1 }, b: { defaultValue: [] } }
    ]

    const goodSchemas = [
      {
        a: {
          defaultValue() {
            return []
          }
        }
      },
      { a: { defaultValue: null } },
      { a: { defaultValue: undefined } },
      { a: { defaultValue: 'Hi' } },
      { a: { defaultValue: 20 } }
    ]

    badSchemas.forEach(properties => {
      assert.throws(() => {
        schemata({ name: 'Bad', properties })
      })
    })

    goodSchemas.forEach(properties => {
      assert.doesNotThrow(() => {
        schemata({ name: 'Good', properties })
      })
    })
  })
})
