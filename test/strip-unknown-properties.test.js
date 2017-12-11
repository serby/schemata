const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema
const createCommentSchema = helpers.createCommentSchema
const assert = require('assert')

describe('#stripUnknownProperties()', () => {
  it('strips out extra properties', () => {
    const schema = createContactSchema()
    schema.stripUnknownProperties({ name: 'Paul', extra: 'This should not be here' }).should.eql({
      name: 'Paul'
    })
  })

  it('strips out properties without the given tag', () => {
    const schema = createContactSchema()
    schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'update').should.eql({
      name: 'Paul'
    })
  })

  it('does not attempt to strip properties of null ', () => {
    const contactSchema = createContactSchema()
    const blogschema = createBlogSchema()

    contactSchema.stripUnknownProperties({ age: null, active: null, extra: null })
      .should.eql({ age: null, active: null })

    blogschema.stripUnknownProperties({ author: null, comments: null })
      .should.eql({ author: null, comments: null })
  })

  it('strips out properties without the given tag and returns empty object if tag is not found', () => {
    const schema = createContactSchema()
    schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'BADTAG').should.eql({})
  })

  it('strips out properties from sub-schemas', () => {
    const schema = createBlogSchema()
    schema.stripUnknownProperties({ author: { name: 'Paul', extra: 'Not here' } })
      .should.eql({ author: { name: 'Paul' } })
  })

  it('does not attempt to strip properties from null sub-schema objects', () => {
    const schema = createBlogSchema()
    schema.stripUnknownProperties({ author: null })
      .should.eql({ author: null })
  })

  it('strips out properties from sub-schemas returned from a type function', () => {
    const schema = createBlogSchema()
    const obj = { author: { name: 'Paul', extra: 'Not here' } }

    schema.schema.author.type = model => {
      assert.deepEqual(model, obj)
      return createContactSchema()
    }

    schema.stripUnknownProperties(obj)
      .should.eql({ author: { name: 'Paul' } })
  })

  it('keeps empty array sub-schemas empty', () => {
    const schema = createBlogSchema()
    schema.stripUnknownProperties({ author: { name: 'Paul' }, comments: [] })
      .should.eql({ author: { name: 'Paul' }, comments: [] })
  })

  it('strips out properties from array sub-schemas', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.extra = 'Hello'
    schema.stripUnknownProperties({ author: { name: 'Paul' }, comments: [ comment ] })
      .should.eql({ author: { name: 'Paul' }, comments: [ { email: null, comment: null, created: null } ] })
  })

  it('strips out properties for parent but ignores sub-schemas when "ignoreSubSchemas" is true', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.comment = 'Do not strip out my comment'
    comment.extra = 'This will be striped as its not in the schema at all'
    schema.stripUnknownProperties({ title: 'My Blog', author: { name: 'Paul' }, comments: [ comment ] }, 'auto', true)
      .should.eql({ title: 'My Blog',
        comments:
        [ { email: null, comment: 'Do not strip out my comment', created: null } ] })
  })

  it('strips out properties for parent and sub-schemas when "ignoreSubSchemas" is false', () => {
    const schema = createBlogSchema()
    const comment = createCommentSchema().makeBlank()

    comment.comment = 'Do not strip out my comment'
    comment.extra = 'Hello'
    schema.stripUnknownProperties({ title: 'My Blog', author: { name: 'Paul' }, comments: [ comment ] }, 'auto')
      .should.eql({ title: 'My Blog', comments: [ { comment: 'Do not strip out my comment' } ] })
  })
})
