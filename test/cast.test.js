const schemata = require('../')
const helpers = require('./helpers')
const should = require('should')
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
  it('converts types correctly', () => {
    const schema = createContactSchema()
    Object.keys(assertions).forEach(type => {
      // Even = expected, odd = supplied
      for (let i = 0; i < assertions[type].length; i += 2) {
        let cast
        cast = schema.castProperty(typeMap[type], assertions[type][i + 1])
        should.strictEqual(cast, assertions[type][i]
          , `Failed to cast '${type}' (test ${i}) from '${assertions[type][i + 1]}' to '${assertions[type][i]}' instead got '${cast}'`)
      }
    })
  })

  it('converts arrays correctly', () => {
    const schema = createArraySchema();
    [ [], null, '' ].forEach(value => {
      Array.isArray(schema.castProperty(Array, value)).should.equal(true)
      schema.castProperty(Array, value).should.have.lengthOf(0)
    });
    [ [ 1 ], [ 'a' ] ].forEach(value => {
      Array.isArray(schema.castProperty(Array, value)).should.equal(true)
      schema.castProperty(Array, value).should.have.lengthOf(1)
    })
  })

  it('converts object correctly', () => {
    const schema = createArraySchema();
    [ '', 'hello', [], undefined ].forEach(value => {
      Object.keys(schema.castProperty(Object, value)).should.have.lengthOf(0)
    });
    [ { a: 'b' } ].forEach(value => {
      Object.keys(schema.castProperty(Object, value)).should.have.lengthOf(1)
    })
    true.should.equal(schema.castProperty(Object, null) === null)
  })

  it('throws exception on unknown type', () => {
    const schema = createContactSchema();
    ((() => {
      schema.castProperty(undefined)
    })).should.throwError()
  })

  it('converts number types of properties correctly', () => {
    const schema = createContactSchema()
    const type = 'number'
    let cast

    for (let i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ age: assertions[type][i + 1] })
      cast.should.eql({ age: assertions[type][i] }
        , `Failed to cast '${type}' from '${assertions[type][i + 1]}' to '${assertions[type][i]}' instead got '${cast.age}' ${JSON.stringify(cast)}`)
    }
  })

  it('converts boolean types of properties correctly', () => {
    const schema = createContactSchema()
    const type = 'boolean'
    let cast

    for (let i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ active: assertions[type][i + 1] })
      cast.should.eql({
        active: assertions[type][i]
      }, `Failed to cast '${type}' from '${assertions[type][i + 1]}' to '${assertions[type][i]}' instead got '${cast.active}'${JSON.stringify(cast)}`)
    }
  })

  it('does not effect untyped properties', () => {
    const schema = createContactSchema()
    schema.cast({ phoneNumber: '555-0923' }).should.eql({
      phoneNumber: '555-0923'
    })
  })

  it('casts properties that have a subschema', () => {
    const schema = createBlogSchema()

    const obj = schema.cast(
      { title: 'My Blog',
        author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() },
        comments: []
      })

    obj.author.dateOfBirth.should.be.instanceOf(Date)
  })

  it('casts properties that have a subschema', () => {
    const schema = createBlogSchema()

    const initialObj =
      { title: 'My Blog',
        author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() },
        comments: []
      }

    schema.schema.author.type = model => {
      assert.deepEqual(model, initialObj)
      return createContactSchema()
    }

    const obj = schema.cast(initialObj)
    obj.author.dateOfBirth.should.be.instanceOf(Date)
  })

  it('casts properties that have null subschemas', () => {
    const schema = createBlogSchema()

    const initialObj =
      { title: 'My Blog',
        author: null,
        comments: []
      }

    schema.schema.author.type = model => {
      assert.deepEqual(model, initialObj)
      return createContactSchema()
    }

    const obj = schema.cast(initialObj)
    assert.strictEqual(obj.author, null)
  })

  it('casts properties that are an array of subschemas', () => {
    const schema = createBlogSchema()

    const obj = schema.cast(
      { title: 'My Blog',
        author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() },
        comments: [ { created: (new Date()).toISOString() } ]
      })

    obj.comments[0].created.should.be.instanceOf(Date)
  })

  it('casts properties that have a conditional/function type', () => {
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

    should.strictEqual(car.tyreWear.nearsideFront, 0)
    should.strictEqual(car.tyreWear.offsideFront, 2)
    should.strictEqual(car.tyreWear.nearsideBack, 3)
    should.strictEqual(car.tyreWear.offsideBack, 5)
  })
})
