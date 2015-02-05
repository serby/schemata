var schemata = require('../')
  , helpers = require('./helpers')
  , createContactSchema = helpers.createContactSchema
  , createBlogSchema = helpers.createBlogSchema

describe('#makeBlank()', function() {

  it('returns correct empty object with no parameters', function() {
    var schema = createContactSchema()
    schema.makeBlank().should.eql({
      name: null,
      age: null,
      active: null,
      phoneNumber: null,
      dateOfBirth: null
    })
  })

  it('creates empty objects for objects type', function() {
    var schema = schemata({
      contacts: {
        type: Object
      }
    })
    schema.makeBlank().should.eql({ contacts: {} })
  })

  it('creates empty arrays for array type', function() {
    var schema = schemata({
      images: {
        type: Array
      }
    })
    schema.makeBlank().should.eql({ images: [] })
  })

  it('creates blank sub-schema objects', function() {
    var schema = createBlogSchema()
      , blog = schema.makeBlank()

    blog.should.have.property('author')
    blog.author.should.have.property('name')
  })

  it('creates blank array for sub-schema Array', function() {
    var schema = createBlogSchema()
      , blog = schema.makeBlank()

    blog.comments.should.be.an.instanceOf(Array)
  })

  it('create new instances for Array type', function() {
    var schema = createBlogSchema()
      , blogA = schema.makeBlank()
      , blogB = schema.makeBlank()

    blogA.comments.push(1)
    blogA.comments.should.have.lengthOf(1)
    blogB.comments.should.have.lengthOf(0)
  })

})
