const assert = require('assert')
const {
  createContactSchema,
  createBlogSchema,
  createNamedSchemata
} = require('./helpers')
const { castProperty } = require('../schemata')
const castFixtures = require('./cast-fixtures')
const assertions = castFixtures.assertions
const typeMap = castFixtures.typeMap
const required = require('validity-required')

describe('#cast()', () => {
  it('converts types correctly', () => {
    Object.keys(assertions).forEach(type => {
      // Even = assert.strictEqualed, odd = supplied
      for (let i = 0; i < assertions[type].length; i += 2) {
        let cast
        cast = castProperty(typeMap[type], assertions[type][i + 1])
        assert.strictEqual(cast, assertions[type][i])
      }
    })
  })

  it('converts arrays correctly', () => {
    ;[[], null, ''].forEach(value => {
      assert.strictEqual(Array.isArray(castProperty(Array, value)), true)
      assert.strictEqual(castProperty(Array, value).length, 0)
    })
    ;[[1], ['a']].forEach(value => {
      assert.strictEqual(Array.isArray(castProperty(Array, value)), true)
      assert.strictEqual(castProperty(Array, value).length, 1)
    })
  })

  it('converts object correctly', () => {
    ;['', 'hello', [], undefined].forEach(value => {
      assert.strictEqual(Object.keys(castProperty(Object, value)).length, 0)
    })
    ;[{ a: 'b' }].forEach(value => {
      assert.strictEqual(Object.keys(castProperty(Object, value)).length, 1)
    })
    assert.strictEqual(castProperty(Object, null) === null, true)
  })

  it('throws exception on unknown type', () => {
    assert.throws(() => {
      castProperty(undefined)
    }, /Missing type/)
  })

  it('converts number types of properties correctly', () => {
    const schema = createContactSchema()
    const type = 'number'
    let cast

    for (let i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ age: assertions[type][i + 1] })
      assert.deepStrictEqual(cast, { age: assertions[type][i] })
    }
  })

  it('converts boolean types of properties correctly', () => {
    const schema = createContactSchema()
    const type = 'boolean'
    let cast

    for (let i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ active: assertions[type][i + 1] })
      assert.deepStrictEqual(cast, {
        active: assertions[type][i]
      })
    }
  })

  it('does not effect untyped properties', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(schema.cast({ phoneNumber: '555-0923' }), {
      phoneNumber: '555-0923'
    })
  })

  it('casts properties that have a subschema', () => {
    const schema = createBlogSchema()

    const obj = schema.cast({
      title: 'My Blog',
      author: { name: 'Paul', dateOfBirth: new Date().toISOString() },
      comments: []
    })

    assert.strictEqual(obj.author.dateOfBirth instanceof Date, true)
  })

  it('casts properties that have a subschema', () => {
    const schema = createBlogSchema()

    const initialObj = {
      title: 'My Blog',
      author: { name: 'Paul', dateOfBirth: new Date().toISOString() },
      comments: []
    }

    schema.getProperties().author.type = model => {
      assert.deepStrictEqual(model, initialObj)
      return createContactSchema()
    }

    const obj = schema.cast(initialObj)
    assert.strictEqual(obj.author.dateOfBirth instanceof Date, true)
  })

  it('casts properties that have null subschemas', () => {
    const schema = createBlogSchema()

    const initialObj = { title: 'My Blog', author: null, comments: [] }

    schema.getProperties().author.type = model => {
      assert.deepStrictEqual(model, initialObj)
      return createContactSchema()
    }

    const obj = schema.cast(initialObj)
    assert.strictEqual(obj.author, null)
  })

  it('casts properties that are an array of subschemas', () => {
    const schema = createBlogSchema()

    const obj = schema.cast({
      title: 'My Blog',
      author: { name: 'Paul', dateOfBirth: new Date().toISOString() },
      comments: [{ created: new Date().toISOString() }]
    })

    assert.strictEqual(obj.comments[0].created instanceof Date, true)
  })

  it('casts properties that have a conditional/function type', () => {
    const vehicleSchema = createNamedSchemata({
      type: { type: String },
      tyreWear: {
        type(obj) {
          // This function takes any configuration of tyres and
          // just ensures that each of the values is a number
          const schema = {}
          if (!obj || !obj.tyreWear) return createNamedSchemata(schema)
          Object.keys(obj.tyreWear).forEach(k => {
            schema[k] = {
              type: Number,
              validators: { all: [required] }
            }
          })
          return createNamedSchemata(schema)
        }
      }
    })

    const bike = vehicleSchema.cast({
      type: 'bike',
      tyreWear: { front: '0', back: '2' }
    })

    const car = vehicleSchema.cast({
      type: 'car',
      tyreWear: {
        nearsideFront: '0',
        offsideFront: '2',
        nearsideBack: '3',
        offsideBack: '5'
      }
    })

    assert.strictEqual(bike.tyreWear.front, 0)
    assert.strictEqual(bike.tyreWear.back, 2)

    assert.strictEqual(car.tyreWear.nearsideFront, 0)
    assert.strictEqual(car.tyreWear.offsideFront, 2)
    assert.strictEqual(car.tyreWear.nearsideBack, 3)
    assert.strictEqual(car.tyreWear.offsideBack, 5)
  })
})
