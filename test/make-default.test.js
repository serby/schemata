var schemata = require('../')
  , helpers = require('./helpers')
  , createContactSchema = helpers.createContactSchema
  , createBlogSchema = helpers.createBlogSchema
  , assert = require('assert')

describe('#makeDefault()', function() {

  it('without a customer schema creates a empty object', function() {
    var schema = schemata()
    schema.makeDefault().should.eql({})
  })

  it('returns correct object', function() {
    var schema = createContactSchema()
    schema.makeDefault().should.eql(
      { name: null
      , age: 0
      , active: true
      , phoneNumber: null
      , dateOfBirth: null
      })
  })

  it('extends given object correctly', function() {
    var schema = createContactSchema()
    schema.makeDefault({ name: 'Paul' }).should.eql(
      { name: 'Paul'
      , age: 0
      , active: true
      , phoneNumber: null
      , dateOfBirth: null
      })
  })

  it('strips out properties not in the schema', function() {
    var schema = createContactSchema()
    schema.makeDefault({ name: 'Paul', extra: 'This should not be here' }).should.eql(
      { name: 'Paul'
      , age: 0
      , active: true
      , phoneNumber: null
      , dateOfBirth: null
      })
  })

  it('creates defaults for sub-schema', function() {
    var schema = createBlogSchema()
    schema.makeDefault().should.eql(
      { title: null
      , body: null
      , author: { name: null, age: 0, active: true, phoneNumber: null, dateOfBirth: null }
      , comments: []
      })
  })

  it('extends given object correctly for sub-schemas', function() {
    var schema = createBlogSchema()
    schema.makeDefault(
      { title: 'Mr. Blogger’s Post'
      , author: { name: 'Mr. Blogger' }
    }).should.eql(
      { title: 'Mr. Blogger’s Post'
      , body: null
      , author: { name: 'Mr. Blogger', age: 0, active: true, phoneNumber: null, dateOfBirth: null }
      , comments: []
      })
  })

  it('create new instances for Array type', function() {
    var schema = createBlogSchema()
      , blogA = schema.makeDefault()
      , blogB = schema.makeDefault()

    blogA.comments.push(1)
    blogA.comments.should.have.lengthOf(1)
    blogB.comments.should.have.lengthOf(0)
  })

  it('makes default on sub-schema objects if type is a function', function() {
    var schema = createBlogSchema()
      , obj =
        { title: 'Mr. Blogger’s Post'
        , author: { name: 'Mr. Blogger' }
        }
      , called = false

    // This function gets called twice, once in makeBlank and once for makeDefault.
    // We want to test the 2nd call
    schema.schema.author.type = function (model) {
      if (called === false) return createContactSchema()
      called = true
      assert.deepEqual(model, obj)
      return createContactSchema()
    }

    schema.makeDefault(obj).should.eql(
      { title: 'Mr. Blogger’s Post'
      , body: null
      , author: { name: 'Mr. Blogger', age: 0, active: true, phoneNumber: null, dateOfBirth: null }
      , comments: []
      })
  })
})
