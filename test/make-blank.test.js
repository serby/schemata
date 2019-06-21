const schemata = require('../schemata')
const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema

describe('#makeBlank()', () => {
  test('returns correct empty object with no parameters', () => {
    const schema = createContactSchema()
    expect(schema.makeBlank()).toEqual({
      name: null,
      age: null,
      active: null,
      phoneNumber: null,
      dateOfBirth: null
    })
  })

  test('creates empty objects for objects type', () => {
    const schema = schemata({
      name: 'Foo',
      properties: {
        contacts: {
          type: Object
        }
      }
    })
    expect(schema.makeBlank()).toEqual({ contacts: {} })
  })

  test('creates empty arrays for array type', () => {
    const schema = schemata({
      name: 'Foo',
      properties: {
        images: {
          type: Array
        }
      }
    })
    expect(schema.makeBlank()).toEqual({ images: [] })
  })

  test('creates blank sub-schema objects', () => {
    const schema = createBlogSchema()
    const blog = schema.makeBlank()

    expect(blog).toHaveProperty('author')
    expect(blog.author).toHaveProperty('name')
  })

  test('creates blank sub-schema objects if type is a function', () => {
    const schema = createBlogSchema()

    schema.getProperties().author.type = () => createContactSchema()

    const blog = schema.makeBlank()

    expect(blog).toHaveProperty('author')
    expect(blog.author).toHaveProperty('name')
  })

  test('creates blank array for sub-schema Array', () => {
    const schema = createBlogSchema()
    const blog = schema.makeBlank()

    expect(blog.comments).toBeInstanceOf(Array)
  })

  test('create new instances for Array type', () => {
    const schema = createBlogSchema()
    const blogA = schema.makeBlank()
    const blogB = schema.makeBlank()

    blogA.comments.push(1)
    expect(blogA.comments).toHaveLength(1)
    expect(blogB.comments).toHaveLength(0)
  })
})
