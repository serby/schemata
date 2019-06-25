const assert = require('assert')
const schemata = require('../schemata')
const {
  createContactSchema,
  createBlogSchema,
  createNamedSchemata
} = require('./helpers')

describe('#makeDefault()', () => {
  it('without a customer schema creates a empty object', () => {
    const schema = schemata({ name: 'Person' })
    assert.deepStrictEqual(schema.makeDefault(), {})
  })

  it('returns correct object', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(schema.makeDefault(), {
      name: null,
      age: 0,
      active: true,
      phoneNumber: null,
      dateOfBirth: null
    })
  })

  it('extends given object correctly', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(schema.makeDefault({ name: 'Paul' }), {
      name: 'Paul',
      age: 0,
      active: true,
      phoneNumber: null,
      dateOfBirth: null
    })
  })

  it('strips out properties not in the schema', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(
      schema.makeDefault({ name: 'Paul', extra: 'This should not be here' }),
      {
        name: 'Paul',
        age: 0,
        active: true,
        phoneNumber: null,
        dateOfBirth: null
      }
    )
  })

  it('creates defaults for sub-schema', () => {
    const schema = createBlogSchema()
    assert.deepStrictEqual(schema.makeDefault(), {
      title: null,
      body: null,
      author: {
        name: null,
        age: 0,
        active: true,
        phoneNumber: null,
        dateOfBirth: null
      },
      comments: []
    })
  })

  it('extends given object correctly for sub-schemas', () => {
    const schema = createBlogSchema()
    assert.deepStrictEqual(
      schema.makeDefault({
        title: 'Mr. Blogger’s Post',
        author: { name: 'Mr. Blogger' }
      }),
      {
        title: 'Mr. Blogger’s Post',
        body: null,
        author: {
          name: 'Mr. Blogger',
          age: 0,
          active: true,
          phoneNumber: null,
          dateOfBirth: null
        },
        comments: []
      }
    )
  })

  it('allows sub-schemas properties to set a default value', () => {
    const properties = createBlogSchema().getProperties()
    properties.author.defaultValue = () =>
      properties.author.type.makeDefault({
        name: 'Mr. Mista',
        active: false
      })
    assert.deepStrictEqual(createNamedSchemata(properties).makeDefault(), {
      title: null,
      body: null,
      author: {
        name: 'Mr. Mista',
        age: 0,
        active: false,
        phoneNumber: null,
        dateOfBirth: null
      },
      comments: []
    })
  })

  it('does not cast sub-schema property default values', () => {
    const schema = createBlogSchema()
    const properties = schema.getProperties()
    properties.author.defaultValue = null

    assert.deepStrictEqual(createNamedSchemata(properties).makeDefault(), {
      title: null,
      body: null,
      author: null,
      comments: []
    })
  })

  it('create new instances for Array type', () => {
    const schema = createBlogSchema()
    const blogA = schema.makeDefault()
    const blogB = schema.makeDefault()

    blogA.comments.push(1)
    assert.strictEqual(blogA.comments.length, 1)
    assert.strictEqual(blogB.comments.length, 0)
  })

  it('makes default on sub-schema objects if type is a function', () => {
    const schema = createBlogSchema()

    const obj = { title: 'Mr. Blogger’s Post', author: { name: 'Mr. Blogger' } }

    let called = false

    // This function gets called twice, once in makeBlank and once for makeDefault.
    // We want to test the 2nd call
    schema.getProperties().author.type = model => {
      if (called === false) return createContactSchema()
      called = true
      assert.deepStrictEqual(model, obj)
      return createContactSchema()
    }

    assert.deepStrictEqual(schema.makeDefault(obj), {
      title: 'Mr. Blogger’s Post',
      body: null,
      author: {
        name: 'Mr. Blogger',
        age: 0,
        active: true,
        phoneNumber: null,
        dateOfBirth: null
      },
      comments: []
    })
  })
})
