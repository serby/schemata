const schemata = require('../')
const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema

describe('#makeBlank()', () => {
  it('returns correct empty object with no parameters', () => {
    const schema = createContactSchema()
    schema.makeBlank().should.eql(
      { name: null,
        age: null,
        active: null,
        phoneNumber: null,
        dateOfBirth: null
      })
  })

  it('creates empty objects for objects type', () => {
    const schema = schemata({
      contacts: {
        type: Object
      }
    })
    schema.makeBlank().should.eql({ contacts: {} })
  })

  it('creates empty arrays for array type', () => {
    const schema = schemata({
      images: {
        type: Array
      }
    })
    schema.makeBlank().should.eql({ images: [] })
  })

  it('creates blank sub-schema objects', () => {
    const schema = createBlogSchema()
    const blog = schema.makeBlank()

    blog.should.have.property('author')
    blog.author.should.have.property('name')
  })

  it('creates blank sub-schema objects if type is a function', () => {
    const schema = createBlogSchema()

    schema.schema.author.type = () => createContactSchema()

    const blog = schema.makeBlank()

    blog.should.have.property('author')
    blog.author.should.have.property('name')
  })

  it('creates blank array for sub-schema Array', () => {
    const schema = createBlogSchema()
    const blog = schema.makeBlank()

    blog.comments.should.be.an.instanceOf(Array)
  })

  it('create new instances for Array type', () => {
    const schema = createBlogSchema()
    const blogA = schema.makeBlank()
    const blogB = schema.makeBlank()

    blogA.comments.push(1)
    blogA.comments.should.have.lengthOf(1)
    blogB.comments.should.have.lengthOf(0)
  })
})
