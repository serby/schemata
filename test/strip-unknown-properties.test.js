const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema
const createCommentSchema = helpers.createCommentSchema
const assert = require('assert')

describe('#stripUnknownProperties()', () => {
  test('strips out extra properties', () => {
    const schema = createContactSchema()
    expect(
      schema.stripUnknownProperties({
        name: 'Paul',
        extra: 'This should not be here'
      })
    ).toEqual({
      name: 'Paul'
    })
  })

  test('strips out properties without the given tag', () => {
    const schema = createContactSchema()
    expect(
      schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'update')
    ).toEqual({
      name: 'Paul'
    })
  })

  test('does not attempt to strip properties of null ', () => {
    const contactSchema = createContactSchema()
    const blogschema = createBlogSchema()

    expect(
      contactSchema.stripUnknownProperties({
        age: null,
        active: null,
        extra: null
      })
    ).toEqual({ age: null, active: null })

    expect(
      blogschema.stripUnknownProperties({ author: null, comments: null })
    ).toEqual({ author: null, comments: null })
  })

  test('strips out properties without the given tag and returns empty object if tag is not found', () => {
    const schema = createContactSchema()
    expect(
      schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'BADTAG')
    ).toEqual({})
  })

  test('strips out properties from sub-schemas', () => {
    const schema = createBlogSchema()
    expect(
      schema.stripUnknownProperties({
        author: { name: 'Paul', extra: 'Not here' }
      })
    ).toEqual({ author: { name: 'Paul' } })
  })

  test('does not attempt to strip properties from null sub-schema objects', () => {
    const schema = createBlogSchema()
    expect(schema.stripUnknownProperties({ author: null })).toEqual({
      author: null
    })
  })

  test('strips out properties from sub-schemas returned from a type function', () => {
    const schema = createBlogSchema()
    const obj = { author: { name: 'Paul', extra: 'Not here' } }

    schema.getProperties().author.type = model => {
      assert.deepStrictEqual(model, obj)
      return createContactSchema()
    }

    expect(schema.stripUnknownProperties(obj)).toEqual({
      author: { name: 'Paul' }
    })
  })

  test('keeps empty array sub-schemas empty', () => {
    const schema = createBlogSchema()
    expect(
      schema.stripUnknownProperties({ author: { name: 'Paul' }, comments: [] })
    ).toEqual({ author: { name: 'Paul' }, comments: [] })
  })

  test('strips out properties from array sub-schemas', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.extra = 'Hello'
    expect(
      schema.stripUnknownProperties({
        author: { name: 'Paul' },
        comments: [comment]
      })
    ).toEqual({
      author: { name: 'Paul' },
      comments: [{ email: null, comment: null, created: null }]
    })
  })

  test('strips out properties for parent but ignores sub-schemas when "ignoreSubSchemas" is true', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.comment = 'Do not strip out my comment'
    comment.extra = 'This will be striped as its not in the schema at all'
    expect(
      schema.stripUnknownProperties(
        { title: 'My Blog', author: { name: 'Paul' }, comments: [comment] },
        'auto',
        true
      )
    ).toEqual({
      title: 'My Blog',
      comments: [
        { email: null, comment: 'Do not strip out my comment', created: null }
      ]
    })
  })

  test('strips out properties for parent and sub-schemas when "ignoreSubSchemas" is false', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.comment = 'Do not strip out my comment'
    comment.extra = 'Hello'
    expect(
      schema.stripUnknownProperties(
        { title: 'My Blog', author: { name: 'Paul' }, comments: [comment] },
        'auto'
      )
    ).toEqual({
      title: 'My Blog',
      comments: [{ comment: 'Do not strip out my comment' }]
    })
  })
})
