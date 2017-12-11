const schemata = require('../')
const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema
const assert = require('assert')

describe('#makeDefault()', () => {
  test('without a customer schema creates a empty object', () => {
    const schema = schemata()
    schema.makeDefault().should.eql({})
  })

  test('returns correct object', () => {
    const schema = createContactSchema()
    schema.makeDefault().should.eql(
      { name: null,
        age: 0,
        active: true,
        phoneNumber: null,
        dateOfBirth: null
      })
  })

  test('extends given object correctly', () => {
    const schema = createContactSchema()
    schema.makeDefault({ name: 'Paul' }).should.eql(
      { name: 'Paul',
        age: 0,
        active: true,
        phoneNumber: null,
        dateOfBirth: null
      })
  })

  test('strips out properties not in the schema', () => {
    const schema = createContactSchema()
    schema.makeDefault({ name: 'Paul', extra: 'This should not be here' }).should.eql(
      { name: 'Paul',
        age: 0,
        active: true,
        phoneNumber: null,
        dateOfBirth: null
      })
  })

  test('creates defaults for sub-schema', () => {
    const schema = createBlogSchema()
    schema.makeDefault().should.eql(
      { title: null,
        body: null,
        author: { name: null, age: 0, active: true, phoneNumber: null, dateOfBirth: null },
        comments: []
      })
  })

  test('extends given object correctly for sub-schemas', () => {
    const schema = createBlogSchema()
    schema.makeDefault(
      { title: 'Mr. Blogger’s Post',
        author: { name: 'Mr. Blogger' }
      }).should.eql(
      { title: 'Mr. Blogger’s Post',
        body: null,
        author: { name: 'Mr. Blogger', age: 0, active: true, phoneNumber: null, dateOfBirth: null },
        comments: []
      })
  })

  test('allows sub-schemas properties to set a default value', () => {
    const schema = createBlogSchema()
    schema.schema.author.defaultValue = function () {
      return this.type.makeDefault(
        { name: 'Mr. Mista',
          active: false
        })
    }
    schema.makeDefault().should.eql(
      { title: null,
        body: null,
        author: { name: 'Mr. Mista', age: 0, active: false, phoneNumber: null, dateOfBirth: null },
        comments: []
      })
  })

  test('allows does not cast sub-schema property default values', () => {
    const schema = createBlogSchema()
    schema.schema.author.defaultValue = null
    schema.makeDefault().should.eql(
      { title: null,
        body: null,
        author: null,
        comments: []
      })
  })

  test('create new instances for Array type', () => {
    const schema = createBlogSchema()
    const blogA = schema.makeDefault()
    const blogB = schema.makeDefault()

    blogA.comments.push(1)
    blogA.comments.should.have.lengthOf(1)
    blogB.comments.should.have.lengthOf(0)
  })

  test('makes default on sub-schema objects if type is a function', () => {
    const schema = createBlogSchema()

    const obj =
      { title: 'Mr. Blogger’s Post',
        author: { name: 'Mr. Blogger' }
      }

    let called = false

    // This function gets called twice, once in makeBlank and once for makeDefault.
    // We want to test the 2nd call
    schema.schema.author.type = model => {
      if (called === false) return createContactSchema()
      called = true
      assert.deepEqual(model, obj)
      return createContactSchema()
    }

    schema.makeDefault(obj).should.eql(
      { title: 'Mr. Blogger’s Post',
        body: null,
        author: { name: 'Mr. Blogger', age: 0, active: true, phoneNumber: null, dateOfBirth: null },
        comments: []
      })
  })
})
