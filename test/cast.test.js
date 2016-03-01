var schemata = require('../')
  , helpers = require('./helpers')
  , should = require('should')
  , assert = require('assert')
  , createContactSchema = helpers.createContactSchema
  , createBlogSchema = helpers.createBlogSchema
  , castFixtures = require('./cast-fixtures')
  , assertions = castFixtures.assertions
  , typeMap = castFixtures.typeMap
  , validity = require('validity')

function createArraySchema() {
  var schema = schemata({
    images: {
      type: Array
    }
  })
  return schema
}

describe('#cast()', function() {

  it('converts types correctly', function() {
    var schema = createContactSchema()
    Object.keys(assertions).forEach(function(type) {
      // Even = expected, odd = supplied
      for (var i = 0; i < assertions[type].length; i += 2) {
        var cast
        cast = schema.castProperty(typeMap[type], assertions[type][i + 1])
        should.strictEqual(cast, assertions[type][i]
          , 'Failed to cast \'' + type + '\' (test ' + i + ') from \''
            + assertions[type][i + 1] + '\' to \'' + assertions[type][i] + '\' instead got \'' + cast + '\'')
      }
    })
  })

  it('converts arrays correctly', function() {
    var schema = createArraySchema();
    [ [], null, '' ].forEach(function(value) {
      Array.isArray(schema.castProperty(Array, value)).should.equal(true)
      schema.castProperty(Array, value).should.have.lengthOf(0)
    });
    [ [ 1 ], [ 'a' ] ].forEach(function(value) {
      Array.isArray(schema.castProperty(Array, value)).should.equal(true)
      schema.castProperty(Array, value).should.have.lengthOf(1)
    })
  })

  it('converts object correctly', function() {
    var schema = createArraySchema();
    [ '', 'hello', [], undefined ].forEach(function(value) {
      Object.keys(schema.castProperty(Object, value)).should.have.lengthOf(0)
    });
    [ { a:'b' } ].forEach(function(value) {
      Object.keys(schema.castProperty(Object, value)).should.have.lengthOf(1)
    })
    true.should.equal(schema.castProperty(Object, null) === null)
  })

  it('throws exception on unknown type', function() {
    var schema = createContactSchema();
    (function() {
      schema.castProperty(undefined)
    }).should.throwError()
  })

  it('converts number types of properties correctly', function() {
    var schema = createContactSchema()
      , type = 'number'
      , cast

    for (var i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ age: assertions[type][i + 1] })
      cast.should.eql({ age: assertions[type][i] }
        , 'Failed to cast \'' + type + '\' from \'' + assertions[type][i + 1] + '\' to \''
          + assertions[type][i] + '\' instead got \'' + cast.age + '\' ' + JSON.stringify(cast))
    }
  })

  it('converts boolean types of properties correctly', function() {
    var schema = createContactSchema()
      , type = 'boolean'
      , cast

    for (var i = 0; i < assertions[type].length; i += 2) {
      cast = schema.cast({ active: assertions[type][i + 1] })
      cast.should.eql({
        active: assertions[type][i]
      }, 'Failed to cast \'' + type + '\' from \'' + assertions[type][i + 1] + '\' to \''
      + assertions[type][i] + '\' instead got \'' + cast.active + '\'' + JSON.stringify(cast))
    }
  })

  it('does not effect untyped properties', function() {
    var schema = createContactSchema()
    schema.cast({ phoneNumber: '555-0923' }).should.eql({
      phoneNumber: '555-0923'
    })
  })

  it('casts properties that have a subschema', function () {
    var schema = createBlogSchema()
      , obj = schema.cast(
          { title: 'My Blog'
          , author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() }
          , comments: []
          })
    obj.author.dateOfBirth.should.be.instanceOf(Date)
  })

  it('casts properties that have a subschema', function () {
    var schema = createBlogSchema()
      , initialObj =
        { title: 'My Blog'
        , author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() }
        , comments: []
        }

    schema.schema.author.type = function (model) {
      assert.deepEqual(model, initialObj)
      return createContactSchema()
    }

    var obj = schema.cast(initialObj)
    obj.author.dateOfBirth.should.be.instanceOf(Date)
  })

  it('casts properties that have null subschemas', function () {
    var schema = createBlogSchema()
      , initialObj =
        { title: 'My Blog'
        , author: null
        , comments: []
        }

    schema.schema.author.type = function (model) {
      assert.deepEqual(model, initialObj)
      return createContactSchema()
    }

    var obj = schema.cast(initialObj)
    assert.strictEqual(obj.author, null)
  })

  it('casts properties that are an array of subschemas', function () {
    var schema = createBlogSchema()
      , obj = schema.cast(
          { title: 'My Blog'
          , author: { name: 'Paul', dateOfBirth: (new Date()).toISOString() }
          , comments: [ { created: (new Date()).toISOString() } ]
          })

    obj.comments[0].created.should.be.instanceOf(Date)

  })

  it('casts properties that have a conditional/function type', function () {
    var vehicleSchema = schemata(
          { type: { type: String }
          , tyreWear:
            { type: function (obj) {
                // This function takes any configuration of tyres and
                // just ensures that each of the values is a number
                var schema = {}
                if (!obj || !obj.tyreWear) return schemata(schema)
                Object.keys(obj.tyreWear).forEach(function (k) {
                  schema[k] = { type: Number, validators: { all: [ validity.required ] } }
                })
                return schemata(schema)
              }
            }
          })

      , bike = vehicleSchema.cast({ type: 'bike', tyreWear: { front: '0', back: '2' } })
      , car = vehicleSchema.cast(
        { type: 'car'
        , tyreWear: { nearsideFront: '0', offsideFront: '2', nearsideBack: '3', offsideBack: '5' }
        })

    assert.deepStrictEqual(bike.tyreWear, { front: 0, back: 2 })
    assert.deepStrictEqual(car.tyreWear, { nearsideFront: 0, offsideFront: 2, nearsideBack: 3, offsideBack: 5 })

  })

})
