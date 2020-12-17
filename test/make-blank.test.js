const assert = require('assert')
const schemata = require('../schemata')
const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema

describe('#makeBlank()', () => {
  it('returns correct empty object with no parameters', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(schema.makeBlank(), {
      name: null,
      age: null,
      active: null,
      phoneNumber: null,
      dateOfBirth: null
    })
  })

  it('creates empty objects for objects type', () => {
    const schema = schemata({
      name: 'Foo',
      properties: {
        contacts: {
          type: Object
        }
      }
    })
    assert.deepStrictEqual(schema.makeBlank(), { contacts: {} })
  })

  it('creates empty arrays for array type', () => {
    const schema = schemata({
      name: 'Foo',
      properties: {
        images: {
          type: Array
        }
      }
    })
    assert.deepStrictEqual(schema.makeBlank(), { images: [] })
  })

  it('creates blank sub-schema objects', () => {
    const schema = createBlogSchema()
    const blog = schema.makeBlank()

    assert.notStrictEqual(blog.author, undefined)
    assert.notStrictEqual(blog.author.name, undefined)
  })

  it('creates blank sub-schema objects if type is a function', () => {
    const schema = createBlogSchema()

    schema.getProperties().author.type = () => createContactSchema()

    const blog = schema.makeBlank()

    assert.notStrictEqual(blog.author, undefined)
    assert.notStrictEqual(blog.author.name, undefined)
  })

  it('creates blank array for sub-schema Array', () => {
    const schema = createBlogSchema()
    const blog = schema.makeBlank()

    assert.strictEqual(blog.comments.length, 0)
  })

  it('create new instances for Array type', () => {
    const schema = createBlogSchema()
    const blogA = schema.makeBlank()
    const blogB = schema.makeBlank()

    blogA.comments.push(1)
    assert.strictEqual(blogA.comments.length, 1)
    assert.strictEqual(blogB.comments.length, 0)
  })

  it('throw for invalid property types', () => {
    const schema = schemata({
      name: 'Foo',
      properties: {
        images: {
          type: { foo: 'bar' }
        }
      }
    })

    assert.throws(() => schema.makeBlank(), Error)
  })
})
