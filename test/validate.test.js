const schemata = require('../')
const helpers = require('./helpers')
const createContactSchema = helpers.createContactSchema
const createBlogSchema = helpers.createBlogSchema
const validity = require('validity')
const propertyValidator = require('validity/property-validator')
const async = require('async')
const assert = require('assert')
const createCommentSchema = helpers.createCommentSchema
const fixtures = require('./validate-fixtures')

function createBlogSchemaWithSubSchemaNotInitialised () {
  return schemata(
    { title: { tag: [ 'auto' ] },
      body: { tag: [ 'auto' ] },
      author: { type: createContactSchema() },
      comments:
      { type: schemata.Array(createCommentSchema),
        tag: [ 'auto' ]
      }
    })
}

function createKidSchema () {
  return schemata(
    { name: { type: String },
      toy: { type: createToySchema() }
    })
}

function createToySchema () {
  return schemata(
    { name: { type: String },
      label: { type: String, validators: [ validity.required ] }
    })
}

function asyncValidator (key, name, object, callback) {
  process.nextTick(() => callback(null, undefined))
}

function createAsyncValidationSubschema () {
  return schemata(
    { id:
      { type: String,
        validators:
        { all: [ validity.required, asyncValidator ]
        }
      },
    quantity:
      { type: String,
        validators:
        { all: [ validity.required ]
        }
      }
    })
}

function createSchemaWithAsyncSubSchema () {
  return schemata(
    { items:
      { type: schemata.Array(createAsyncValidationSubschema),
        validators:
        { all: [ validity.required ]
        }
      }
    })
}

describe('#validate()', () => {
  test('does not error on schemas without validation', done => {
    const schema = createContactSchema()
    schema.validate(schema.makeDefault({ name: 'Paul' }), 'all', (ignoreError, errors) => {
      expect(errors).toEqual({})
      done()
    })
  })

  test('returns error for missing property', done => {
    const properties = createContactSchema().getProperties()
    expect(properties.name).not.toHaveProperty('validators')
    properties.name.validators = {
      all: [ validity.required ]
    }
    const schema = schemata(properties)
    schema.validate(schema.makeDefault({ name: '' }), 'all', (ignoreError, errors) => {
      expect(errors).toEqual({ name: 'Full Name is required' })
      done()
    })
  })

  test('uses the [all] set by default', done => {
    const properties = createContactSchema().getProperties()
    expect(properties.name).not.toHaveProperty('validators')
    properties.name.validators = {
      all: [ validity.required ]
    }
    const schema = schemata(properties)

    schema.validate(schema.makeDefault({ name: '' }), '', (ignoreError, errors) => {
      expect(errors).toEqual({ name: 'Full Name is required' })
      done()
    })
  })

  test('returns error for missing property but not for valid property', done => {
    const properties = createContactSchema().getProperties()
    expect(properties.name).not.toHaveProperty('validators')
    properties.name.validators = {
      all: [ validity.required ]
    }

    properties.age.validators = {
      all: [ validity.required ]
    }

    const schema = schemata(properties)

    schema.validate(schema.makeDefault({ name: '', age: 33 }), 'all', (ignoreError, errors) => {
      expect(errors).toEqual({ name: 'Full Name is required' })
      done()
    })
  })

  test('uses all validators', done => {
    const properties = createContactSchema().getProperties()

    properties.name.validators = {
      all: [ validity.required, validity.length(2, 4) ]
    }
    const schema = schemata(properties)
    schema.validate(schema.makeDefault({ name: 'A' }), 'all', (ignoreError, errors) => {
      expect(errors).toEqual({ name: 'Full Name must be between 2 and 4 in length' })
      done()
    })
  })

  test('validates only for tag passed in', done => {
    const properties = createContactSchema().getProperties()

    // Adding required validation to a schema property with a tag
    properties.name.validators = {
      all: [ validity.required ]
    }

    // Adding required validation to a schema property without a tag
    properties.age.validators = {
      all: [ validity.required ]
    }

    const schema = schemata(properties)
    schema.validate(schema.makeBlank(), 'all', 'update', (ignoreError, errors) => {
      expect(errors).toEqual({
        name: 'Full Name is required'
      })
      done()
    })
  })

  test('validates by tag and by set', done => {
    const properties = createContactSchema().getProperties()

    properties.name.validators = {
      all: [ validity.required ]
    }

    properties.name.tag = [ 'newTag' ]

    properties.age.validators = {
      all: [ validity.required ]
    }

    properties.age.tag = [ 'differentTag' ]

    const schema = schemata(properties)
    schema.validate(schema.makeBlank(), 'all', 'newTag', (ignoreError, errors) => {
      expect(errors).toEqual({
        name: 'Full Name is required'
      })
      done()
    })
  })

  test('allows tag and set to be optional parameters', done => {
    const properties = createContactSchema().getProperties()

    properties.name.validators = {
      all: [ validity.required ]
    }

    properties.age.validators = {
      all: [ validity.required ]
    }
    const schema = schemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      expect(errors).toEqual({ name: 'Full Name is required',
        age: 'Age is required'
      })
      done()
    })
  })

  test('Validates sub-schemas', () => {
    const properties = createBlogSchema().getProperties()
    const subSchemaProperties = properties.author.type.getProperties()
    subSchemaProperties.age.validators = {
      all: [ validity.required ]
    }
    properties.author.type = schemata(subSchemaProperties)
    const schema = schemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      expect(errors).toEqual({ author: {
        age: 'Age is required'
      } })
    })
  })

  test(
    'validates sub-schemas where subschema is returned from the type property function',
    done => {
      const properties = createBlogSchema().getProperties()
      const subSchemaProperties = createContactSchema().getProperties()
      const object = { author: 1 }

      subSchemaProperties.age.validators = {
        all: [ validity.required ]
      }

      properties.author.type = obj => {
        assert.deepEqual(obj, object)
        return schemata(subSchemaProperties)
      }

      const schema = schemata(properties)
      schema.validate(object, (ignoreError, errors) => {
        assert.deepEqual(errors, { author: { age: 'Age is required' } })
        return done()
      })
    }
  )

  test(
    'Validates sub-schemas property is not listed in errors when there are no errors',
    () => {
      const schema = createBlogSchema()
      schema.validate(schema.makeBlank(), (ignoreError, errors) => {
        expect(errors).toEqual({})
      })
    }
  )

  test('Validates any defined validators even on sub-schemas', () => {
    const properties = createBlogSchema().getProperties()
    properties.author.validators = {
      all: [ propertyValidator((key, object, callback) => {
        callback(null)
      }, 'Bad') ]
    }
    const schema = schemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      expect(errors).toEqual({ author: 'Bad' })
    })
  })

  test('validators failure should prevent their sub-schema validation', () => {
    const properties = createBlogSchema().getProperties()
    properties.author.type.getProperties().age.validators = {
      all: [ propertyValidator((key, object, callback) => {
        expect('This should not get called').toBe(false)
        callback(null)
      }, 'sub-schema property validation (This should not be seen)') ]
    }
    properties.author.validators = {
      all: [ propertyValidator((key, object, callback) => {
        callback(null)
      }, 'First level property validation') ]
    }
    const schema = schemata(properties)
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      expect(errors).toEqual({ author: 'First level property validation' })
    })
  })

  test(
    'validators failure should not prevent other properties’ sub-schemas from validating',
    done => {
      // this is an edge case, and having the required validator on author is crucial. without it,
      // the bug won’t manifest itself
      const properties = createBlogSchema().getProperties()
      properties.title.validators = {
        all: [ propertyValidator((key, object, callback) => {
          callback(null)
        }, 'First level property validation failure') ]
      }

      properties.author.validators = {
        all: [ validity.required ]
      }

      const subSchemaProperties = properties.author.type.getProperties()
      subSchemaProperties.age.validators = {
        all: [ propertyValidator((key, object, callback) => {
          callback(null)
        }, 'sub-schema property validation') ]
      }
      properties.author.type = schemata(subSchemaProperties)
      const schema = schemata(properties)
      schema.validate(schema.makeBlank(), (error, errors) => {
        expect(errors).toEqual({
          author: { age: 'sub-schema property validation' },
          title: 'First level property validation failure'
        })
        done(error)
      })
    }
  )

  test('Validates array sub-schemas', done => {
    const properties = createBlogSchema().getProperties()
    const subSchemaProperties = properties.comments.type.arraySchema.getProperties()

    subSchemaProperties.email.validators = {
      all: [ validity.required ]
    }

    subSchemaProperties.comment.validators = {
      all: [ validity.required ]
    }
    properties.comments.type = schemata.Array(schemata(subSchemaProperties))
    const schema = schemata(properties)
    const model = schema.makeBlank()
    model.comments.push({ email: null, comment: null })
    model.comments.push({ email: null, comment: 'comment' })
    model.comments.push({ email: 'dom@test.com', comment: null })

    schema.validate(model, (ignoreError, errors) => {
      expect(errors.comments[0]).toEqual({ email: 'Email is required', comment: 'Comment is required' })
      expect(errors.comments[1]).toEqual({ email: 'Email is required' })
      expect(errors.comments[2]).toEqual({ comment: 'Comment is required' })

      done()
    })
  })

  test(
    'Validates array sub-schemas and maintains order of errors for async validators',
    done => {
      const schema = createSchemaWithAsyncSubSchema()

      const model =
        { items:
          [ { id: '1', quantity: '' },
            { id: '', quantity: '' }
          ]
        }

      const validationErrors =
        { items:
          { 0: { quantity: 'Quantity is required' },
            1: { id: 'Id is required', quantity: 'Quantity is required' }
          }
        }

      schema.validate(model, (error, errors) => {
        expect(errors).toEqual(validationErrors)
        done(error)
      })
    }
  )

  test(
    'Does not throw a stack size error when validating a large array set',
    done => {
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
    }
  )

  test('should cause an error if a subSchema is passed un-invoked', done => {
    const properties = createBlogSchemaWithSubSchemaNotInitialised().getProperties()

    const testValues = [ undefined, null, '', 0, [] ]
    const subSchema = properties.comments.type.arraySchema.getProperties()

    subSchema.email.validators = {
      all: [ validity.required ]
    }
    properties.comments.type = schemata.Array(schemata(subSchema))
    const schema = schemata(properties)
    const model = schema.makeBlank()
    async.forEach(testValues, (value, next) => {
      model.comments = value

      schema.validate(model, (ignoreError, errors) => {
        expect(errors).toEqual({})
        next()
      })
    }, done)
  })

  test(
    'does not try and validate array sub-schemas that are falsy or []',
    done => {
      const properties = createBlogSchema().getProperties()
      const testValues = [ undefined, null, '', 0, [] ]
      const subSchema = properties.comments.type.arraySchema.getProperties()

      subSchema.email.validators = {
        all: [ validity.required ]
      }
      properties.comments.type = schemata.Array(schemata(subSchema))
      const schema = schemata(properties)
      const model = schema.makeBlank()
      async.forEach(testValues, (value, next) => {
        model.comments = value

        schema.validate(model, (ignoreError, errors) => {
          expect(errors).toEqual({})
          next()
        })
      }, done)
    }
  )

  test('does not try and validate sub-schemas that are falsy', done => {
    const kidSchema = createKidSchema()
    const kid = kidSchema.makeBlank()
    const emptyValues = [ undefined, null, '', 0 ]

    async.forEach(emptyValues, (value, next) => {
      kid.toy = value

      kidSchema.validate(kid, (ignoreError, errors) => {
        expect(errors).toEqual({})
        next()
      })
    }, done)
  })

  test('allows error response to be a string instead of Error object', done => {
    const properties = createContactSchema().getProperties()
    properties.name.validators = {
      all: [ (key, errorProperty, object, callback) => callback(null, object[key] ? undefined : `${errorProperty} is required`) ]
    }
    const schema = schemata(properties)
    schema.validate(schema.makeDefault({ name: '' }), (ignoreError, errors) => {
      expect(errors).toEqual({ name: 'Full Name is required' })
      done()
    })
  })

  test(
    'should not call the callback multiple times when omitting optional args',
    done => {
      const schema = createBlogSchema()
      schema.validate(schema.makeDefault({ comments: [ {}, {} ] }), 'all', () => {
        done()
      })
    }
  )

  test(
    'should pass the parent to callback if it has five arguments and is a subschema',
    done => {
      const properties = createBlogSchema().getProperties()
      const subSchema = properties.author.type.getProperties()
      let schemaParent

      subSchema.name.validators = {
        all: [ (key, errorProperty, object, parent, callback) => {
          schemaParent = parent
          return callback(null, object[key] ? undefined : `${errorProperty} is required`)
        } ]
      }
      properties.author.type = schemata(subSchema)
      const schema = schemata(properties)
      schema.validate(schema.makeDefault({ author: { name: 'test' } }), () => {
        expect(schemaParent).toEqual(fixtures.blog)
        done()
      })
    }
  )

  test(
    'should pass the schema as parent to callback if it has five arguments and is not a subschema',
    done => {
      const properties = createBlogSchema().getProperties()
      let schemaParent
      properties.title.validators = {
        all: [ (key, errorProperty, object, parent, callback) => {
          schemaParent = parent
          return callback(null, object[key] ? undefined : `${errorProperty} is required`)
        } ]
      }
      const schema = schemata(properties)
      schema.validate(schema.makeDefault({ author: { name: 'test' } }), () => {
        expect(schemaParent).toEqual(fixtures.blog)
        done()
      })
    }
  )

  test('should not leak parents across validates', done => {
    const properties = createBlogSchema().getProperties()
    const schemaParents = []
    const expectedParents = fixtures.expectedParents
    let expectedParent
    let observedParent

    properties.title.validators = {
      all: [ (key, errorProperty, object, parent, callback) => {
        schemaParents.push(parent)
        return callback(null, object[key] ? undefined : `${errorProperty} is required`)
      } ]
    }
    const schema = schemata(properties)
    async.eachSeries(expectedParents, (model, next) => {
      schema.validate(schema.makeDefault(model), () => {
        expectedParent = expectedParents[schemaParents.length - 1]
        observedParent = schemaParents[schemaParents.length - 1]
        assert.deepEqual(expectedParent, observedParent, 'Wrong parent schema returned')
        next()
      })
    }, done)
  })
})
