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
  it('does not error on schemas without validation', done => {
    const schema = createContactSchema()
    schema.validate(schema.makeDefault({ name: 'Paul' }), 'all', (ignoreError, errors) => {
      errors.should.eql({})
      done()
    })
  })

  it('returns error for missing property', done => {
    const schema = createContactSchema()

    schema.schema.name.should.not.have.property('validators')
    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeDefault({ name: '' }), 'all', (ignoreError, errors) => {
      errors.should.eql({ name: 'Full Name is required' })
      done()
    })
  })

  it('uses the [all] set by default', done => {
    const schema = createContactSchema()
    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeDefault({ name: '' }), '', (ignoreError, errors) => {
      errors.should.eql({ name: 'Full Name is required' })
      done()
    })
  })

  it('returns error for missing property but not for valid property', done => {
    const schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeDefault({ name: '', age: 33 }), 'all', (ignoreError, errors) => {
      errors.should.eql({ name: 'Full Name is required' })
      done()
    })
  })

  it('uses all validators', done => {
    const schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required, validity.length(2, 4) ]
    }

    schema.validate(schema.makeDefault({ name: 'A' }), 'all', (ignoreError, errors) => {
      errors.should.eql({ name: 'Full Name must be between 2 and 4 in length' })
      done()
    })
  })

  it('validates only for tag passed in', done => {
    const schema = createContactSchema()

    // Adding required validation to a schema property with a tag
    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    // Adding required validation to a schema property without a tag
    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeBlank(), 'all', 'update', (ignoreError, errors) => {
      errors.should.eql({
        name: 'Full Name is required'
      })
      done()
    })
  })

  it('validates by tag and by set', done => {
    const schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.schema.name.tag = [ 'newTag' ]

    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.schema.age.tag = [ 'differentTag' ]

    schema.validate(schema.makeBlank(), 'all', 'newTag', (ignoreError, errors) => {
      errors.should.eql({
        name: 'Full Name is required'
      })
      done()
    })
  })

  it('allows tag and set to be optional parameters', done => {
    const schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      errors.should.eql(
        { name: 'Full Name is required',
          age: 'Age is required'
        })
      done()
    })
  })

  it('Validates sub-schemas', () => {
    const schema = createBlogSchema()
    schema.schema.author.type.schema.age.validators = {
      all: [ validity.required ]
    }
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      errors.should.eql({ author: {
        age: 'Age is required'
      } })
    })
  })

  it('validates sub-schemas where subschema is returned from the type property function', done => {
    const schema = createBlogSchema()
    const ageRequiredContactSchema = createContactSchema()
    const object = { author: 1 }

    ageRequiredContactSchema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.schema.author.type = obj => {
      assert.deepEqual(obj, object)
      return ageRequiredContactSchema
    }

    schema.validate(object, (ignoreError, errors) => {
      assert.deepEqual(errors, { author: { age: 'Age is required' } })
      return done()
    })
  })

  it('Validates sub-schemas property is not listed in errors when there are no errors', () => {
    const schema = createBlogSchema()
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      errors.should.eql({})
    })
  })

  it('Validates any defined validators even on sub-schemas', () => {
    const schema = createBlogSchema()
    schema.schema.author.validators = {
      all: [ propertyValidator((key, object, callback) => {
        callback(null)
      }, 'Bad') ]
    }
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      errors.should.eql({ author: 'Bad' })
    })
  })

  it('validators failure should prevent their sub-schema validation', () => {
    const schema = createBlogSchema()
    schema.schema.author.type.schema.age.validators = {
      all: [ propertyValidator((key, object, callback) => {
        'This should not get called'.should.equal(false)
        callback(null)
      }, 'sub-schema property validation (This should not be seen)') ]
    }
    schema.schema.author.validators = {
      all: [ propertyValidator((key, object, callback) => {
        callback(null)
      }, 'First level property validation') ]
    }
    schema.validate(schema.makeBlank(), (ignoreError, errors) => {
      errors.should.eql({ author: 'First level property validation' })
    })
  })

  it('validators failure should not prevent other properties’ sub-schemas from validating', done => {
    // this is an edge case, and having the required validator on author is crucial. without it,
    // the bug won’t manifest itself
    const schema = createBlogSchema()
    schema.schema.title.validators = {
      all: [ propertyValidator((key, object, callback) => {
        callback(null)
      }, 'First level property validation failure') ]
    }

    schema.schema.author.type.schema.age.validators = {
      all: [ propertyValidator((key, object, callback) => {
        callback(null)
      }, 'sub-schema property validation') ]
    }

    schema.schema.author.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeBlank(), (error, errors) => {
      errors.should.eql({
        author: { age: 'sub-schema property validation' },
        title: 'First level property validation failure'
      })
      done(error)
    })
  })

  it('Validates array sub-schemas', done => {
    const schema = createBlogSchema()
    const model = schema.makeBlank()
    const subSchema = schema.schema.comments.type.arraySchema.schema

    subSchema.email.validators = {
      all: [ validity.required ]
    }

    subSchema.comment.validators = {
      all: [ validity.required ]
    }

    model.comments.push({ email: null, comment: null })
    model.comments.push({ email: null, comment: 'comment' })
    model.comments.push({ email: 'dom@test.com', comment: null })

    schema.validate(model, (ignoreError, errors) => {
      errors.comments[0].should.eql({ email: 'Email is required', comment: 'Comment is required' })
      errors.comments[1].should.eql({ email: 'Email is required' })
      errors.comments[2].should.eql({ comment: 'Comment is required' })

      done()
    })
  })

  it('Validates array sub-schemas and maintains order of errors for async validators', done => {
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
      errors.should.eql(validationErrors)
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

  it('should cause an error if a subSchema is passed un-invoked', done => {
    const schema = createBlogSchemaWithSubSchemaNotInitialised()
    const model = schema.makeBlank()
    const testValues = [ undefined, null, '', 0, [] ]
    const subSchema = schema.schema.comments.type.arraySchema.schema

    subSchema.email.validators = {
      all: [ validity.required ]
    }

    async.forEach(testValues, (value, next) => {
      model.comments = value

      schema.validate(model, (ignoreError, errors) => {
        errors.should.eql({})
        next()
      })
    }, done)
  })

  it('does not try and validate array sub-schemas that are falsy or []', done => {
    const schema = createBlogSchema()
    const model = schema.makeBlank()
    const testValues = [ undefined, null, '', 0, [] ]
    const subSchema = schema.schema.comments.type.arraySchema.schema

    subSchema.email.validators = {
      all: [ validity.required ]
    }

    async.forEach(testValues, (value, next) => {
      model.comments = value

      schema.validate(model, (ignoreError, errors) => {
        errors.should.eql({})
        next()
      })
    }, done)
  })

  it('does not try and validate sub-schemas that are falsy', done => {
    const kidSchema = createKidSchema()
    const kid = kidSchema.makeBlank()
    const emptyValues = [ undefined, null, '', 0 ]

    async.forEach(emptyValues, (value, next) => {
      kid.toy = value

      kidSchema.validate(kid, (ignoreError, errors) => {
        errors.should.eql({}, `Should not run validation when toy is ${value}`)
        next()
      })
    }, done)
  })

  it('allows error response to be a string instead of Error object', done => {
    const schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ (key, errorProperty, object, callback) => callback(null, object[key] ? undefined : `${errorProperty} is required`) ]
    }

    schema.validate(schema.makeDefault({ name: '' }), (ignoreError, errors) => {
      errors.should.eql({ name: 'Full Name is required' })
      done()
    })
  })

  it('should not call the callback multiple times when omitting optional args', done => {
    const schema = createBlogSchema()
    schema.validate(schema.makeDefault({ comments: [ {}, {} ] }), 'all', () => {
      done()
    })
  })

  it('should pass the parent to callback if it has five arguments and is a subschema', done => {
    const schema = createBlogSchema()
    const subSchema = schema.schema.author.type.schema
    let schemaParent

    subSchema.name.validators = {
      all: [ (key, errorProperty, object, parent, callback) => {
        schemaParent = parent
        return callback(null, object[key] ? undefined : `${errorProperty} is required`)
      } ]
    }

    schema.validate(schema.makeDefault({ author: { name: 'test' } }), () => {
      schemaParent.should.eql(fixtures.blog, 'Schema parent was not returned in the callback')
      done()
    })
  })

  it('should pass the schema as parent to callback if it has five arguments and is not a subschema', done => {
    const schema = createBlogSchema()
    let schemaParent

    schema.schema.title.validators = {
      all: [ (key, errorProperty, object, parent, callback) => {
        schemaParent = parent
        return callback(null, object[key] ? undefined : `${errorProperty} is required`)
      } ]
    }

    schema.validate(schema.makeDefault({ author: { name: 'test' } }), () => {
      schemaParent.should.eql(fixtures.blog, 'Schema parent was not the schema itself')
      done()
    })
  })

  it('should not leak parents across validates', done => {
    const schema = createBlogSchema()
    const schemaParents = []
    const expectedParents = fixtures.expectedParents
    let expectedParent
    let observedParent

    schema.schema.title.validators = {
      all: [ (key, errorProperty, object, parent, callback) => {
        schemaParents.push(parent)
        return callback(null, object[key] ? undefined : `${errorProperty} is required`)
      } ]
    }

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
