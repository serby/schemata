var schemata = require('../')
  , helpers = require('./helpers')
  , createContactSchema = helpers.createContactSchema
  , createBlogSchema = helpers.createBlogSchema
  , validity = require('validity')
  , propertyValidator = require('validity/property-validator')
  , async = require('async')
  , assert = require('assert')
  , createCommentSchema = helpers.createCommentSchema

function createBlogSchemaWithSubSchemaNotInitialised() {
  return schemata(
    { title: { tag: [ 'auto' ] }
    , body: { tag: [ 'auto' ] }
    , author: { type: createContactSchema() }
    , comments:
      { type: schemata.Array(createCommentSchema)
      , tag: [ 'auto' ]
      }
    })
}

function createKidSchema() {
  return schemata(
    { name: { type: String }
    , toy: { type: createToySchema() }
    })
}

function createToySchema() {
  return schemata(
    { name: { type: String }
    , label: { type: String, validators: { all: [ validity.required ] } }
    })
}

function asyncValidator(key, name, object, callback) {
  process.nextTick(function () {
    return callback(null, undefined)
  })
}

function createAsyncValidationSubschema() {
  return schemata(
    { id:
      { type: String
      , validators:
        { all: [ validity.required, asyncValidator ]
        }
      }
    , quantity:
      { type: String
      , validators:
        { all: [ validity.required ]
        }
      }
    })
}

function createSchemaWithAsyncSubSchema() {
  return schemata(
    { items:
      { type: schemata.Array(createAsyncValidationSubschema)
      , validators:
        { all: [ validity.required ]
        }
      }
    })
}

describe('#validate()', function() {

  it('does not error on schemas without validation', function(done) {
    var schema = createContactSchema()
    schema.validate(schema.makeDefault({ name: 'Paul' }), 'all', function(error, errors) {
      errors.should.eql({})
      done()
    })
  })

  it('returns error for missing property', function(done) {
    var schema = createContactSchema()

    schema.schema.name.should.not.have.property('validators')
    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeDefault({ name: '' }), 'all', function(error, errors) {
      errors.should.eql({ name:'Full Name is required' })
      done()
    })
  })

  it('uses the [all] set by default', function(done) {
    var schema = createContactSchema()
    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeDefault({ name: '' }), '', function(error, errors) {
      errors.should.eql({ name: 'Full Name is required' })
      done()
    })
  })

  it('returns error for missing property but not for valid property', function(done) {
    var schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeDefault({ name: '', age: 33 }), 'all', function(error, errors) {
      errors.should.eql({ name: 'Full Name is required' })
      done()
    })
  })

  it('uses all validators', function(done) {
    var schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required , validity.length(2, 4) ]
    }

    schema.validate(schema.makeDefault({ name: 'A' }), 'all', function(error, errors) {
      errors.should.eql({ name: 'Full Name must be between 2 and 4 in length' })
      done()
    })
  })

  it('validates only for tag passed in', function(done) {
    var schema = createContactSchema()

    // Adding required validation to a schema property with a tag
    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    // Adding required validation to a schema property without a tag
    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeBlank(), 'all', 'update', function(error, errors) {
      errors.should.eql({
        name: 'Full Name is required'
      })
      done()
    })
  })

  it('validates by tag and by set', function(done) {
    var schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.schema.name.tag = [ 'newTag' ]

    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.schema.age.tag = [ 'differentTag' ]

    schema.validate(schema.makeBlank(), 'all', 'newTag', function(error, errors) {
      errors.should.eql({
        name: 'Full Name is required'
      })
      done()
    })

  })

  it('allows tag and set to be optional parameters', function(done) {
    var schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ validity.required ]
    }

    schema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeBlank(), function(error, errors) {
      errors.should.eql(
        { name: 'Full Name is required'
        , age: 'Age is required'
        })
      done()
    })
  })

  it('Validates sub-schemas', function() {
    var schema = createBlogSchema()
    schema.schema.author.type.schema.age.validators = {
      all: [ validity.required ]
    }
    schema.validate(schema.makeBlank(), function(error, errors) {
      errors.should.eql({ author: {
        age: 'Age is required'
      } })
    })
  })

  it('validates sub-schemas where subschema is returned from the type property function', function (done) {
    var schema = createBlogSchema()
      , ageRequiredContactSchema = createContactSchema()
      , object = { author: 1 }

    ageRequiredContactSchema.schema.age.validators = {
      all: [ validity.required ]
    }

    schema.schema.author.type = function (obj) {
      assert.deepEqual(obj, object)
      return ageRequiredContactSchema
    }

    schema.validate(object, function(error, errors) {
      assert.deepEqual(errors, { author: { age: 'Age is required' } })
      return done()
    })
  })

  it('Validates sub-schemas property is not listed in errors when there are no errors', function() {
    var schema = createBlogSchema()
    schema.validate(schema.makeBlank(), function(error, errors) {
      errors.should.eql({})
    })
  })

  it('Validates any defined validators even on sub-schemas', function() {
    var schema = createBlogSchema()
    schema.schema.author.validators = {
      all: [ propertyValidator(function(key, object, callback) {
        callback(false)
      }, 'Bad') ]
    }
    schema.validate(schema.makeBlank(), function(error, errors) {
      errors.should.eql({ author: 'Bad' })
    })
  })

  it('validators failure should prevent their sub-schema validation', function() {
    var schema = createBlogSchema()
    schema.schema.author.type.schema.age.validators = {
      all: [ propertyValidator(function(key, object, callback) {
        'This should not get called'.should.equal(false)
        callback(false)
      }, 'sub-schema property validation (This should not be seen)') ]
    }
    schema.schema.author.validators = {
      all: [ propertyValidator(function(key, object, callback) {
        callback(false)
      }, 'First level property validation') ]
    }
    schema.validate(schema.makeBlank(), function(error, errors) {
      errors.should.eql({ author: 'First level property validation' })
    })
  })

  it('validators failure should not prevent other properties’ sub-schemas from validating', function(done) {
    // this is an edge case, and having the required validator on author is crucial. without it,
    // the bug won’t manifest itself
    var schema = createBlogSchema()
    schema.schema.title.validators = {
      all: [ propertyValidator(function(key, object, callback) {
        callback(false)
      }, 'First level property validation failure') ]
    }

    schema.schema.author.type.schema.age.validators = {
      all: [ propertyValidator(function(key, object, callback) {
        callback(false)
      }, 'sub-schema property validation') ]
    }

    schema.schema.author.validators = {
      all: [ validity.required ]
    }

    schema.validate(schema.makeBlank(), function(error, errors) {
      errors.should.eql({
        author: { age: 'sub-schema property validation' }
      , title: 'First level property validation failure'
      })
      done(error)
    })
  })

  it('Validates array sub-schemas', function (done) {
    var schema = createBlogSchema()
      , model = schema.makeBlank()
      , subSchema = schema.schema.comments.type.arraySchema.schema

    subSchema.email.validators = {
      all: [ validity.required ]
    }

    subSchema.comment.validators = {
      all: [ validity.required ]
    }

    model.comments.push({ email: null, comment: null })
    model.comments.push({ email: null, comment: 'comment' })
    model.comments.push({ email: 'dom@test.com', comment: null })

    schema.validate(model, function (error, errors) {
      errors.comments[0].should.eql({ email: 'Email is required',comment: 'Comment is required' })
      errors.comments[1].should.eql({ email: 'Email is required' })
      errors.comments[2].should.eql({ comment: 'Comment is required' })

      done()
    })
  })

  it('Validates array sub-schemas and maintains order of errors for async validators', function (done) {
    var schema = createSchemaWithAsyncSubSchema()
      , model =
        { items:
          [ { id: '1', quantity: '' }
          , { id: '', quantity: '' }
          ]
        }
      , validationErrors =
        { items:
          { 0: { quantity: 'Quantity is required' }
          , 1: { id: 'Id is required', quantity: 'Quantity is required' }
          }
        }

    schema.validate(model, function (err, errors) {
      errors.should.eql(validationErrors)
      done()
    })
  })

  it('should cause an error if a subSchema is passed un-invoked', function (done) {
    var schema = createBlogSchemaWithSubSchemaNotInitialised()
      , model = schema.makeBlank()
      , testValues = [ undefined, null, '', 0, [] ]
      , subSchema = schema.schema.comments.type.arraySchema.schema

    subSchema.email.validators = {
      all: [ validity.required ]
    }

    async.forEach(testValues, function (value, next) {
      model.comments = value

      schema.validate(model, function (error, errors) {
        errors.should.eql({})
        next()
      })
    }, done)
  })

  it('does not try and validate array sub-schemas that are falsy or []', function (done) {
    var schema = createBlogSchema()
      , model = schema.makeBlank()
      , testValues = [ undefined, null, '', 0, [] ]
      , subSchema = schema.schema.comments.type.arraySchema.schema

    subSchema.email.validators = {
      all: [ validity.required ]
    }

    async.forEach(testValues, function (value, next) {
      model.comments = value

      schema.validate(model, function (error, errors) {
        errors.should.eql({})
        next()
      })
    }, done)
  })

  it('does not try and validate sub-schemas that are falsy', function (done) {
    var kidSchema = createKidSchema()
      , kid = kidSchema.makeBlank()
      , emptyValues = [ undefined, null, '', 0 ]

   async.forEach(emptyValues, function (value, next) {
      kid.toy = value

      kidSchema.validate(kid, function (error, errors) {
        errors.should.eql({}, 'Should not run validation when toy is ' + value)
        next()
      })
    }, done)
  })

  it('allows error response to be a string instead of Error object', function(done) {
    var schema = createContactSchema()

    schema.schema.name.validators = {
      all: [ function(key, errorProperty, object, callback) {
        return callback(undefined, object[key] ? undefined : errorProperty + ' is required')
      } ]
    }

    schema.validate(schema.makeDefault({ name: '' }), function(error, errors) {
      errors.should.eql({ name:'Full Name is required' })
      done()
    })
  })

  it('should not call the callback multiple times when omitting optional args', function (done) {
    var schema = createBlogSchema()
    schema.validate(schema.makeDefault({ comments: [ {}, {} ] }), 'all', function () {
      done()
    })
  })

})
