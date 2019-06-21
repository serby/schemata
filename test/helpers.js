const schemata = require('../schemata')

const createContactSchema = () => {
  return schemata({
    name: 'Contact',
    properties: {
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
        tag: 'update'
      },
      dateOfBirth: {
        type: Date
      }
    }
  })
}

const createBlogSchema = () => {
  return schemata({
    name: 'Blog',
    properties: {
      title: {
        tag: ['auto']
      },
      body: {
        tag: ['auto']
      },
      author: {
        type: createContactSchema()
      },
      comments: {
        type: schemata.Array(createCommentSchema()),
        tag: ['auto']
      }
    }
  })
}

const createCommentSchema = () => {
  return schemata({
    name: 'Comment',
    properties: {
      email: {},
      comment: {
        tag: ['auto']
      },
      created: {
        type: Date
      }
    }
  })
}

const createNamedSchemata = properties => schemata({ name: 'Foo', properties })

module.exports = {
  createContactSchema,
  createBlogSchema,
  createCommentSchema,
  createNamedSchemata
}
