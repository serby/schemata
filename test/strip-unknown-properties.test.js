const assert = require('assert')
const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema
const createCommentSchema = helpers.createCommentSchema

describe('#stripUnknownProperties()', () => {
  it('strips out extra properties', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(
      schema.stripUnknownProperties({
        name: 'Paul',
        extra: 'This should not be here'
      }),
      {
        name: 'Paul'
      }
    )
  })

  it('strips out properties without the given tag', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(
      schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'update'),
      {
        name: 'Paul'
      }
    )
  })

  it('does not attempt to strip properties of null ', () => {
    const contactSchema = createContactSchema()
    const blogschema = createBlogSchema()

    assert.deepStrictEqual(
      contactSchema.stripUnknownProperties({
        age: null,
        active: null,
        extra: null
      }),
      { age: null, active: null }
    )

    assert.deepStrictEqual(
      blogschema.stripUnknownProperties({ author: null, comments: null }),
      { author: null, comments: null }
    )
  })

  it('strips out properties without the given tag and returns empty object if tag is not found', () => {
    const schema = createContactSchema()
    assert.deepStrictEqual(
      schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'BADTAG'),
      {}
    )
  })

  it('strips out properties from sub-schemas', () => {
    const schema = createBlogSchema()
    assert.deepStrictEqual(
      schema.stripUnknownProperties({
        author: { name: 'Paul', extra: 'Not here' }
      }),
      { author: { name: 'Paul' } }
    )
  })

  it('does not attempt to strip properties from null sub-schema objects', () => {
    const schema = createBlogSchema()
    assert.deepStrictEqual(schema.stripUnknownProperties({ author: null }), {
      author: null
    })
  })

  it('strips out properties from sub-schemas returned from a type function', () => {
    const schema = createBlogSchema()
    const obj = { author: { name: 'Paul', extra: 'Not here' } }

    schema.getProperties().author.type = model => {
      assert.deepdeepStrictEqual(model, obj)
      return createContactSchema()
    }

    assert.deepStrictEqual(schema.stripUnknownProperties(obj), {
      author: { name: 'Paul' }
    })
  })

  it('keeps empty array sub-schemas empty', () => {
    const schema = createBlogSchema()
    assert.deepStrictEqual(
      schema.stripUnknownProperties({ author: { name: 'Paul' }, comments: [] }),
      { author: { name: 'Paul' }, comments: [] }
    )
  })

  it('strips out properties from array sub-schemas', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.extra = 'Hello'
    assert.deepStrictEqual(
      schema.stripUnknownProperties({
        author: { name: 'Paul' },
        comments: [comment]
      }),
      {
        author: { name: 'Paul' },
        comments: [{ email: null, comment: null, created: null }]
      }
    )
  })

  it('strips out properties for parent but ignores sub-schemas when "ignoreSubSchemas" is true', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.comment = 'Do not strip out my comment'
    comment.extra = 'This will be striped as its not in the schema at all'
    assert.deepStrictEqual(
      schema.stripUnknownProperties(
        { title: 'My Blog', author: { name: 'Paul' }, comments: [comment] },
        'auto',
        true
      ),
      {
        title: 'My Blog',
        comments: [
          { email: null, comment: 'Do not strip out my comment', created: null }
        ]
      }
    )
  })

  it('strips out properties for parent and sub-schemas when "ignoreSubSchemas" is false', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.comment = 'Do not strip out my comment'
    comment.extra = 'Hello'
    assert.deepStrictEqual(
      schema.stripUnknownProperties(
        { title: 'My Blog', author: { name: 'Paul' }, comments: [comment] },
        'auto'
      ),
      {
        title: 'My Blog',
        comments: [{ comment: 'Do not strip out my comment' }]
      }
    )
  })
})
