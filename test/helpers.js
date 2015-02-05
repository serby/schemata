var schemata = require('../')

module.exports =
  { createContactSchema: createContactSchema
  , createBlogSchema: createBlogSchema
  , createCommentSchema: createCommentSchema
  }

function createContactSchema() {
  var schema = schemata({
    name: {
      tag: ['update'],
      name: 'Full Name'
    },
    age: {
      type: Number,
      defaultValue: 0
    },
    active: {
      type: Boolean,
      defaultValue: true
    },
    phoneNumber: {
      tag: ['update']
    },
    dateOfBirth: { type: Date }
  })
  return schema
}

function createBlogSchema() {

  var blogSchema = schemata({
    title: {
      tag: ['auto']
    },
    body: {
      tag: ['auto']
    },
    author: {
      type: createContactSchema()
    },
    comments:
      { type: schemata.Array(createCommentSchema())
      , tag: ['auto']
    }
  })
  return blogSchema
}

function createCommentSchema() {
  return schemata({
    email: {},
    comment: {
      tag: ['auto']
    },
    created: { type: Date }
  })
}
