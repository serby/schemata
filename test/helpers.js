const schemata = require('../')

function createContactSchema () {
  return schemata({
    name: {
      tag: [ 'update' ],
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
      tag: [ 'update' ]
    },
    dateOfBirth: {
      type: Date
    }
  })
}

function createBlogSchema () {
  return schemata({
    title: {
      tag: [ 'auto' ]
    },
    body: {
      tag: [ 'auto' ]
    },
    author: {
      type: createContactSchema()
    },
    comments: {
      type: schemata.Array(createCommentSchema()),
      tag: [ 'auto' ]
    }
  })
}

function createCommentSchema () {
  return schemata({
    email: {},
    comment: {
      tag: [ 'auto' ]
    },
    created: {
      type: Date
    }
  })
}

module.exports = {
  createContactSchema,
  createBlogSchema,
  createCommentSchema
}
