const schemata = require('../')
const helpers = require('./helpers')
const assert = require('assert')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema
const castFixtures = require('./cast-fixtures')
const assertions = castFixtures.assertions
const typeMap = castFixtures.typeMap
const validity = require('validity')

function createArraySchema () {
  const schema = schemata({
    images: {
      type: Array
    }
  })
  return schema
}

describe('#cast()', () => {
  test('converts types correctly', () => {
    const schema = createContactSchema()
    Object.keys(assertions).forEach(type => {
      // Even = expected, odd = supplied
      for (let i = 0; i < assertions[type].length; i += 2) {
        let cast
        cast = schema.castProperty(typeMap[type], assertions[type][i + 1])
        expect(cast).toEqual(assertions[type][i])
      }
    })
  })

  test('converts arrays correctly', () => {
    const schema = createArraySchema();
    [ [], null, '' ].forEach(value => {
      expect(Array.isArray(schema.castProperty(Array, value))).toBe(true)
      expect(schema.castProperty(Array, value)).toHaveLength(0)
    });
    [ [ 1 ], [ 'a' ] ].forEach(value => {
      expect(Array.isArray(schema.castProperty(Array, value))).toBe(true)
      expect(schema.castProperty(Array, value)).toHaveLength(1)
    })
  })

  test('converts object correctly', () => {
    const schema = createArraySchema();
    [ '', 'hello', [], undefined ].forEach(value => {
      expect(Object.keys(schema.castProperty(Object, value))).toHaveLength(0)
    });
    [ { a: 'b' } ].forEach(value => {
      expect(Object.keys(schema.castProperty(Object, value))).toHaveLength(1)
    })
    expect(true).toBe(schema.castProperty(Object, null) === null)
  })

  test('throws exception on unknown type', () => {
    const schema = createContactSchema()
    expect(() => {
      schema.castProperty(undefined)
    }).toThrowError(/Missing type/)
  })

  test('converts number types of properties correctly', () => {
    const schema = createContactSchema()
    const type = 'number'
    let cast

    for (let i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ age: assertions[type][i + 1] })
      expect(cast).toEqual({ age: assertions[type][i] })
    }
  })

  test('converts boolean types of properties correctly', () => {
    const schema = createContactSchema()
    const type = 'boolean'
    let cast

    for (let i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ active: assertions[type][i + 1] })
      expect(cast).toEqual({
        active: assertions[type][i]
      })
    }
  })

  test('does not effect untyped properties', () => {
    const schema = createContactSchema()
    expect(schema.cast({ phoneNumber: '555-0923' })).toEqual({
      phoneNumber: '555-0923'
    })
  })

  test('casts properties that have a subschema', () => {
    const schema = createBlogSchema()

    const obj = schema.cast(
      { title: 'My Blog',
        author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() },
        comments: []
      })

    expect(obj.author.dateOfBirth).toBeInstanceOf(Date)
  })

  test('casts properties that have a subschema', () => {
    const schema = createBlogSchema()

    const initialObj =
      { title: 'My Blog',
        author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() },
        comments: []
      }

    schema.getProperties().author.type = model => {
      assert.deepEqual(model, initialObj)
      return createContactSchema()
    }

    const obj = schema.cast(initialObj)
    expect(obj.author.dateOfBirth).toBeInstanceOf(Date)
  })

  test('casts properties that have null subschemas', () => {
    const schema = createBlogSchema()

    const initialObj =
      { title: 'My Blog',
        author: null,
        comments: []
      }

    schema.getProperties().author.type = model => {
      assert.deepEqual(model, initialObj)
      return createContactSchema()
    }

    const obj = schema.cast(initialObj)
    assert.strictEqual(obj.author, null)
  })

  test('casts properties that are an array of subschemas', () => {
    const schema = createBlogSchema()

    const obj = schema.cast(
      { title: 'My Blog',
        author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() },
        comments: [ { created: (new Date()).toISOString() } ]
      })

    expect(obj.comments[0].created).toBeInstanceOf(Date)
  })

  test('casts properties that have a conditional/function type', () => {
    const vehicleSchema = schemata(
      { type: { type: String },
        tyreWear:
            { type (obj) {
              // This function takes any configuration of tyres and
              // just ensures that each of the values is a number
              const schema = {}
              if (!obj || !obj.tyreWear) return schemata(schema)
              Object.keys(obj.tyreWear).forEach(k => {
                schema[k] = { type: Number, validators: { all: [ validity.required ] } }
              })
              return schemata(schema)
            }
            }
      })

    const bike = vehicleSchema.cast({ type: 'bike', tyreWear: { front: '0', back: '2' } })

    const car = vehicleSchema.cast(
      { type: 'car',
        tyreWear: { nearsideFront: '0', offsideFront: '2', nearsideBack: '3', offsideBack: '5' }
      })

    assert.strictEqual(bike.tyreWear.front, 0)
    assert.strictEqual(bike.tyreWear.back, 2)

    expect(car.tyreWear.nearsideFront).toEqual(0)
    expect(car.tyreWear.offsideFront).toEqual(2)
    expect(car.tyreWear.nearsideBack).toEqual(3)
    expect(car.tyreWear.offsideBack).toEqual(5)
  })
})
