const assert = require('assert')
const async = require('async')
const schemata = require('../schemata')
const {
  createContactSchema,
  createBlogSchema,
  createCommentSchema,
  createNamedSchemata
} = require('./helpers')
const { createValidatorAllowingFailureMessageOverride } = require('validity')
const required = require('validity-required')
const length = require('validity-length')
const fixtures = require('./validate-fixtures')

function createBlogSchemaWithSubschemaNotInitialised() {
  return createNamedSchemata({
    title: { tag: ['auto'] },
    body: { tag: ['auto'] },
    author: { type: createContactSchema() },
    comments: { type: schemata.Array(createCommentSchema), tag: ['auto'] }
  })
}

function createKidSchema() {
  return createNamedSchemata({
    name: { type: String },
    toy: { type: createToySchema() }
  })
}

function createToySchema() {
  return createNamedSchemata({
    name: { type: String },
    label: { type: String, validators: [required] }
  })
}

function asyncValidator(key, name, object, callback) {
  process.nextTick(() => callback(null, undefined))
}

function createAsyncValidationSubschema() {
  return createNamedSchemata({
    id: {
      type: String,
      validators: { all: [required, asyncValidator] }
    },
    quantity: { type: String, validators: { all: [required] } }
  })
}

function createSchemaWithAsyncSubschema() {
  return createNamedSchemata({
    items: {
      type: schemata.Array(createAsyncValidationSubschema),
      validators: { all: [required] }
    }
  })
}

describe('#validate()', () => {
  it('does not error on schemas without validation', done => {
    const schema = createContactSchema()
    schema.validate(
      schema.makeDefault({ name: 'Paul' }),
      'all',
      (ignoreError, errors) => {
        assert.deepStrictEqual(errors, {})
        done()
      }
    )
  })

  it('returns promise if no callback', async () => {
    const schema = createContactSchema()
    const errors = await schema.validate(
      schema.makeDefault({ name: 'Paul' }),
      'all'
    )
    assert.deepStrictEqual(errors, {})
  })

  it('returns promise with errors', async () => {
    const properties = createContactSchema().getProperties()
    assert.deepStrictEqual(properties.name.validators, undefined)
    properties.name.validators = [required]
    const schema = createNamedSchemata(properties)
    const errors = await schema.validate(schema.makeDefault({}), 'all')
    assert.deepStrictEqual(errors, { name: 'Full Name is required' })
  })

  it('returns error for missing property', done => {
    const properties = createContactSchema().getProperties()
    assert.deepStrictEqual(properties.name.validators, undefined)
    properties.name.validators = {
      all: [required]
    }
    const schema = createNamedSchemata(properties)
    schema.validate(
      schema.makeDefault({ name: '' }),
      'all',
      (ignoreError, errors) => {
        assert.deepStrictEqual(errors, { name: 'Full Name is required' })
        done()
      }
    )
  })

  it('uses the [all] set by default', done => {
    const properties = createContactSchema().getProperties()
    assert.deepStrictEqual(properties.name.validators, undefined)
    properties.name.validators = {
      all: [required]
    }
    const schema = createNamedSchemata(properties)

    schema.validate(
      schema.makeDefault({ name: '' }),
      '',
      (ignoreError, errors) => {
        assert.deepStrictEqual(errors, { name: 'Full Name is required' })
        done()
      }
    )
  })

  it('returns error for missing property but not for valid property', done => {
    const properties = createContactSchema().getProperties()
    assert.deepStrictEqual(properties.name.validators, undefined)
    properties.name.validators = {
      all: [required]
    }

    properties.age.validators = {
      all: [required]
    }

    const schema = createNamedSchemata(properties)

    schema.validate(
      schema.makeDefault({ name: '', age: 33 }),
      'all',
      (ignoreError, errors) => {
        assert.deepStrictEqual(errors, { name: 'Full Name is required' })
        done()
      }
    )
  })

  it('uses all validators', done => {
    const properties = createContactSchema().getProperties()

    properties.name.validators = {
      all: [required, length(2, 4)]
    }
    const schema = createNamedSchemata(properties)
    schema.validate(
      schema.makeDefault({ name: 'A' }),
      'all',
      (ignoreError, errors) => {
        assert.deepStrictEqual(errors, {
          name: 'Full Name must be between 2 and 4 in length'
        })
        done()
      }
    )
  })

  it('validates only for tag passed in', done => {
    const properties = createContactSchema().getProperties()

    // Adding required validation to a schema property with a tag
    properties.name.validators = {
      all: [required]
    }

    // Adding required validation to a schema property without a tag
    properties.age.validators = {
      all: [required]
    }

    const schema = createNamedSchemata(properties)
    schema.validate(
      schema.makeBlank(),
      'all',
      'update',
      (ignoreError, errors) => {
        assert.deepStrictEqual(errors, { name: 'Full Name is required' })
        done()
      }
    )
  })

  it('validates by tag and by set', done => {
    const properties = createContactSchema().getProperties()

    properties.name.validators = {
      all: [required]
    }

    properties.name.tag = ['newTag']

    properties.age.validators = {
      all: [required]
    }

    properties.age.tag = ['differentTag']

    const schema = createNamedSchemata(properties)
    schema.validate(
      schema.makeBlank(),
      'all',
      'newTag',
      (ignoreError, errors) => {
        assert.deepStrictEqual(errors, { name: 'Full Name is required' })
        done()
      }
    )
  })

  it('allows tag and set to be optional parameters', done => {
    const properties = createContactSchema().getProperties()

    properties.name.validators = {
      all: [required]
    }

    properties.age.validators = {
      all: [required]
    }
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      assert.deepStrictEqual(errors, {
        name: 'Full Name is required',
        age: 'Age is required'
      })
      done()
    })
  })

  it('Validates sub-schemas', () => {
    const properties = createBlogSchema().getProperties()
    const subschemaProperties = properties.author.type.getProperties()
    subschemaProperties.age.validators = {
      all: [required]
    }
    properties.author.type = createNamedSchemata(subschemaProperties)
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      assert.deepStrictEqual(errors, {
        author: {
          age: 'Age is required'
        }
      })
    })
  })

  it('validates sub-schemas where subschema is returned from the type property function', done => {
    const properties = createBlogSchema().getProperties()
    const subschemaProperties = createContactSchema().getProperties()
    const object = { author: 1 }

    subschemaProperties.age.validators = {
      all: [required]
    }

    properties.author.type = createNamedSchemata(subschemaProperties)

    const schema = createNamedSchemata(properties)
    schema.validate(object, (ignoreError, errors) => {
      assert.deepStrictEqual(errors, { author: { age: 'Age is required' } })
      return done()
    })
  })

  it('Validates sub-schemas property is not listed in errors when there are no errors', () => {
    const schema = createBlogSchema()
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      assert.deepStrictEqual(errors, {})
    })
  })

  it('Validates any defined validators even on sub-schemas', () => {
    const properties = createBlogSchema().getProperties()
    properties.author.validators = {
      all: [
        createValidatorAllowingFailureMessageOverride(
          (key, object, callback) => {
            callback(null)
          },
          'Bad'
        )
      ]
    }
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      assert.deepStrictEqual(errors, { author: 'Bad' })
    })
  })

  it('validators failure should prevent their sub-schema validation', () => {
    const properties = createBlogSchema().getProperties()
    properties.author.type.getProperties().age.validators = {
      all: [
        createValidatorAllowingFailureMessageOverride(
          (key, object, callback) => {
            assert.deepStrictEqual('This should not get called', false)
            callback(null)
          },
          'sub-schema property validation (This should not be seen)'
        )
      ]
    }
    properties.author.validators = {
      all: [
        createValidatorAllowingFailureMessageOverride(
          (key, object, callback) => {
            callback(null)
          },
          'First level property validation'
        )
      ]
    }
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      assert.deepStrictEqual(errors, {
        author: 'First level property validation'
      })
    })
  })

  it('validators failure should not prevent other properties’ sub-schemas from validating', done => {
    // this is an edge case, and having the required validator on author is crucial. without it,
    // the bug won’t manifest itself
    const properties = createBlogSchema().getProperties()
    properties.title.validators = {
      all: [
        createValidatorAllowingFailureMessageOverride(
          (key, object, callback) => {
            callback(null)
          },
          'First level property validation failure'
        )
      ]
    }

    properties.author.validators = {
      all: [required]
    }

    const subschemaProperties = properties.author.type.getProperties()
    subschemaProperties.age.validators = {
      all: [
        createValidatorAllowingFailureMessageOverride(
          (key, object, callback) => {
            callback(null)
          },
          'sub-schema property validation'
        )
      ]
    }
    properties.author.type = createNamedSchemata(subschemaProperties)
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeBlank(), (error, errors) => {
      assert.deepStrictEqual(errors, {
        author: { age: 'sub-schema property validation' },
        title: 'First level property validation failure'
      })
      done(error)
    })
  })

  it('Validates array sub-schemas', done => {
    const properties = createBlogSchema().getProperties()
    const subschemaProperties = properties.comments.type.arraySchema.getProperties()

    subschemaProperties.email.validators = {
      all: [required]
    }

    subschemaProperties.comment.validators = {
      all: [required]
    }
    properties.comments.type = schemata.Array(
      createNamedSchemata(subschemaProperties)
    )
    const schema = createNamedSchemata(properties)
    const model = schema.makeBlank()
    model.comments.push({ email: null, comment: null })
    model.comments.push({ email: null, comment: 'comment' })
    model.comments.push({ email: 'dom@test.com', comment: null })

    schema.validate(model, (ignoreError, errors) => {
      assert.deepStrictEqual(errors.comments[0], {
        email: 'Email is required',
        comment: 'Comment is required'
      })
      assert.deepStrictEqual(errors.comments[1], { email: 'Email is required' })
      assert.deepStrictEqual(errors.comments[2], {
        comment: 'Comment is required'
      })
      done()
    })
  })

  it('Validates array sub-schemas and maintains order of errors for async validators', done => {
    const schema = createSchemaWithAsyncSubschema()

    const model = {
      items: [{ id: '1', quantity: '' }, { id: '', quantity: '' }]
    }

    const validationErrors = {
      items: {
        0: { quantity: 'Quantity is required' },
        1: { id: 'Id is required', quantity: 'Quantity is required' }
      }
    }

    schema.validate(model, (error, errors) => {
      assert.deepStrictEqual(errors, validationErrors)
      done(error)
    })
  })

  it('Does not throw a stack size error when validating a large array set', done => {
    const schema = createBlogSchema()
    const model = schema.makeBlank()

    for (let i = 0; i < 2000; i++) {
      model.comments.push({ email: `test${i}@test.com`, comment: 'comment' })
    }

    assert.doesNotThrow(() => {
      schema.validate(model, () => {
        done()
      })
    }, 'should not thrown an exception')
  })

  it('should cause an error if a subschema is passed un-invoked', done => {
    const properties = createBlogSchemaWithSubschemaNotInitialised().getProperties()

    const testValues = [undefined, null, '', 0, []]
    const subschema = properties.comments.type.arraySchema.getProperties()

    subschema.email.validators = {
      all: [required]
    }
    properties.comments.type = schemata.Array(createNamedSchemata(subschema))
    const schema = createNamedSchemata(properties)
    const model = schema.makeBlank()
    async.forEach(
      testValues,
      (value, next) => {
        model.comments = value

        schema.validate(model, (ignoreError, errors) => {
          assert.deepStrictEqual(errors, {})
          next()
        })
      },
      done
    )
  })

  it('does not try and validate array sub-schemas that are falsy or []', done => {
    const properties = createBlogSchema().getProperties()
    const testValues = [undefined, null, '', 0, []]
    const subschema = properties.comments.type.arraySchema.getProperties()

    subschema.email.validators = {
      all: [required]
    }
    properties.comments.type = schemata.Array(createNamedSchemata(subschema))
    const schema = createNamedSchemata(properties)
    const model = schema.makeBlank()
    async.forEach(
      testValues,
      (value, next) => {
        model.comments = value

        schema.validate(model, (ignoreError, errors) => {
          assert.deepStrictEqual(errors, {})
          next()
        })
      },
      done
    )
  })

  it('does not try and validate sub-schemas that are falsy', done => {
    const kidSchema = createKidSchema()
    const kid = kidSchema.makeBlank()
    const emptyValues = [undefined, null, '', 0]

    async.forEach(
      emptyValues,
      (value, next) => {
        kid.toy = value

        kidSchema.validate(kid, (ignoreError, errors) => {
          assert.deepStrictEqual(errors, {})
          next()
        })
      },
      done
    )
  })

  it('allows error response to be a string instead of Error object', done => {
    const properties = createContactSchema().getProperties()
    properties.name.validators = {
      all: [
        (key, errorProperty, object, callback) =>
          callback(
            null,
            object[key] ? undefined : `${errorProperty} is required`
          )
      ]
    }
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeDefault({ name: '' }), (ignoreError, errors) => {
      assert.deepStrictEqual(errors, { name: 'Full Name is required' })
      done()
    })
  })

  it('should not call the callback multiple times when omitting optional args', done => {
    const schema = createBlogSchema()
    schema.validate(schema.makeDefault({ comments: [{}, {}] }), 'all', () => {
      done()
    })
  })

  it('should pass the parent to callback if it has five arguments and is a subschema', done => {
    const properties = createBlogSchema().getProperties()
    const subschema = properties.author.type.getProperties()
    let schemaParent = null

    subschema.name.validators = {
      all: [
        (key, errorProperty, object, parent, callback) => {
          schemaParent = parent
          return callback(
            null,
            object[key] ? undefined : `${errorProperty} is required`
          )
        }
      ]
    }
    properties.author.type = createNamedSchemata(subschema)
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeDefault({ author: { name: 'test' } }), () => {
      assert.deepStrictEqual(schemaParent, fixtures.blog)
      done()
    })
  })

  it('should pass the schema as parent to callback if it has five arguments and is not a subschema', done => {
    const properties = createBlogSchema().getProperties()
    let schemaParent
    properties.title.validators = {
      all: [
        (key, errorProperty, object, parent, callback) => {
          schemaParent = parent
          return callback(
            null,
            object[key] ? undefined : `${errorProperty} is required`
          )
        }
      ]
    }
    const schema = createNamedSchemata(properties)
    schema.validate(schema.makeDefault({ author: { name: 'test' } }), () => {
      assert.deepStrictEqual(schemaParent, fixtures.blog)
      done()
    })
  })

  it('should not leak parents across validates', done => {
    const properties = createBlogSchema().getProperties()
    const schemaParents = []
    const expectedParents = fixtures.expectedParents
    let expectedParent
    let observedParent

    properties.title.validators = {
      all: [
        (key, errorProperty, object, parent, callback) => {
          schemaParents.push(parent)
          return callback(
            null,
            object[key] ? undefined : `${errorProperty} is required`
          )
        }
      ]
    }
    const schema = createNamedSchemata(properties)
    async.eachSeries(
      expectedParents,
      (model, next) => {
        schema.validate(schema.makeDefault(model), () => {
          expectedParent = expectedParents[schemaParents.length - 1]
          observedParent = schemaParents[schemaParents.length - 1]
          assert.deepStrictEqual(
            expectedParent,
            observedParent,
            'Wrong parent schema returned'
          )
          next()
        })
      },
      done
    )
  })
  it('should allow promise validators', async () => {
    const properties = createContactSchema().getProperties()
    properties.name.validators = [
      async (propertyName, name, object) =>
        `${propertyName} ${name} ${object[propertyName]}`
    ]
    const schema = createNamedSchemata(properties)
    const errors = await schema.validate(
      schema.makeDefault({ name: 'Paul' }),
      'all'
    )
    assert.deepStrictEqual(errors, { name: 'name Full Name Paul' })
  })
  it('should allow non-async validators', async () => {
    const properties = createContactSchema().getProperties()
    properties.name.validators = [
      (propertyName, name, object) =>
        `${propertyName} ${name} ${object[propertyName]}`
    ]
    const schema = createNamedSchemata(properties)
    const errors = await schema.validate(schema.makeDefault({ name: 'Paul' }))
    assert.deepStrictEqual(errors, { name: 'name Full Name Paul' })
  })
  it('should allow callback, promise and non-async validators', async () => {
    // Regular function
    const isOfWizardingAge = (propertyName, name, entity) =>
      entity[propertyName] < 17 && 'Sorry you are not of age'

    const databaseLookup = async () => null

    // Promise
    const isUniqueAge = async (propertyName, name, entity) => {
      const found = await databaseLookup({ age: entity[propertyName] })
      if (found) return `${entity[propertyName]} already exists`
    }

    const properties = createContactSchema().getProperties()
    properties.age.validators = [
      isOfWizardingAge,
      isUniqueAge,
      (propertyName, name, object, cb) =>
        cb(null, `${propertyName} ${name} ${object[propertyName]}`)
    ]
    const schema = createNamedSchemata(properties)
    const errors = await schema.validate(
      schema.makeDefault({ name: 'Paul', age: 18 })
    )
    assert.deepStrictEqual(errors, { age: 'age Age 18' })
  })
})
