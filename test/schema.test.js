const schemata = require('../')

describe('#schema', () => {
  test('should default to an empty schemata', () => {
    const empty = schemata()
    expect(empty.getProperties()).toEqual({})
  })

  test(
    'should throw an error if a defaultValue is neither a primitive value or a function',
    () => {
      const badSchemas =
            [ { a: { defaultValue: [] } },
              { a: { defaultValue: {} } },
              { a: { defaultValue: new Date() } },
              { a: { defaultValue: 1 }, b: { defaultValue: [] } }
            ]

      const goodSchemas =
          [ { a: { defaultValue () { return [] } } },
            { a: { defaultValue: null } },
            { a: { defaultValue: undefined } },
            { a: { defaultValue: 'Hi' } },
            { a: { defaultValue: 20 } }
          ]

      badSchemas.forEach(s => {
        expect(() => { schemata(s) }).toThrowError()
      })

      goodSchemas.forEach(s => {
        expect(() => { schemata(s) }).not.toThrowError()
      })
    }
  )
})
