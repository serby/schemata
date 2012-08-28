var schemata = require('..')
  , validation = require('piton-validity').validation
  , createPropertyValidator = require('piton-validity').createPropertyValidator
  , should = require('should')
  ;

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
    }
  });
  return schema;
}

function createCommentSchema() {
  return schemata({
    email: {},
    comment: {}
  });
}

function createBlogSchema() {

  var blogSchema = schemata({
    title: {
    },
    body: {
    },
    author: {
      type: createContactSchema()
    },
    comments: {
      type: schemata.Array(createCommentSchema())
    }
  });
  return blogSchema;
}

function createArraySchema() {
  var schema = schemata({
    images: {
      type: Array
    }
  });
  return schema;
}

// Casting
var typeMap = {
    'string': String,
    'number': Number,
    'boolean': Boolean,
    'object': Object,
    'array': Array,
    'date': Date
  }
  ,d
  , assertions = {
    string: [
      '1', [1],
      '2', [2]
    ],
    number: [
      382, 382,
      245, '245',
      831.3, 831.3,
      831.3, '831.3',
      null, null,
      null, ''],
    boolean: [
      true, true,
      true, 1,
      true, 't',
      true, 'true',
      true, 'on',
      true, 'yes',
      false, false,
      false, 'false',
      false, 0,
      false, 'off',
      false, 'no',
      null, null,
      null, ''],
    date: [
      null, null,
      d = new Date(), d
    ]
  };

describe('schemata', function() {

  describe('#schema', function() {

    it('schema should be empty for a default schemata', function() {
      var empty = schemata();
      empty.schema.should.eql({});
    });

    it('schema should be read only', function() {
      var empty = schemata();
      empty.schema.write = true;
      empty.schema.should.eql({});
    });


  });

  describe('#makeBlank()', function() {

    it('returns correct empty object with no parameters', function() {
      var schema = createContactSchema();
      schema.makeBlank().should.eql({
        name: null,
        age: null,
        active: null,
        phoneNumber: null
      });
    });

    it('creates empty objects for objects type', function() {
      var schema = schemata({
        contacts: {
          type: Object
        }
      });
      schema.makeBlank().should.eql({ contacts: {} });
    });

    it('creates empty arrays for array type', function() {
      var schema = schemata({
        images: {
          type: Array
        }
      });
      schema.makeBlank().should.eql({ images: [] });
    });

    it('creates blank sub-schema objects', function() {
      var schema = createBlogSchema()
        , blog = schema.makeBlank();

      blog.should.have.property('author');
      blog.author.should.have.property('name');
    });

    it('creates blank array for sub-schema Array', function() {
      var schema = createBlogSchema()
        , blog = schema.makeBlank();

      blog.comments.should.be.an.instanceOf(Array);
    });

  });

  describe('#makeDefault()', function() {

    it('without a customer schema creates a empty object', function() {
      var schema = schemata();
      schema.makeDefault().should.eql({});
    });

    it('returns correct object', function() {
      var schema = createContactSchema();
      schema.makeDefault().should.eql({
        name: null,
        age: 0,
        active: true,
        phoneNumber: null
      });
    });

    it('extends given object correctly', function() {
      var schema = createContactSchema();
      schema.makeDefault({ name: 'Paul' }).should.eql({
        name: 'Paul',
        age: 0,
        active: true,
        phoneNumber: null
      });
    });

    it('strips out properties not in the schema', function() {
      var schema = createContactSchema();
      schema.makeDefault({ name: 'Paul', extra: 'This should not be here'}).should.eql({
        name: 'Paul',
        age: 0,
        active: true,
        phoneNumber: null
      });
    });

    it('creates defaults for sub-schema', function() {
      var schema = createBlogSchema();
      schema.makeDefault().should.eql({
        title: null,
        body: null,
        author: { name: null, age: null, active: null, phoneNumber: null },
        comments: []
      });
    });
  });

  describe('#stripUnknownProperties()', function() {

    it('strips out extra properties', function() {
      var schema = createContactSchema();
      schema.stripUnknownProperties({ name: 'Paul', extra: 'This should not be here' }).should.eql({
        name: 'Paul'
      });
    });

    it('strips out properties without the given tag', function() {
      var schema = createContactSchema();
      schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'update').should.eql({
        name: 'Paul'
      });
    });

    it('strips out properties without the given tag and returns empty object if tag is not found', function() {
      var schema = createContactSchema();
      schema.stripUnknownProperties({ name: 'Paul', age: 21 }, 'BADTAG').should.eql({});
    });

    it('strips out properties from sub-schemas', function() {
      var schema = createBlogSchema();
      schema.stripUnknownProperties({ author: { name: 'Paul', extra: 'Not here' }})
        .should.eql({author: { name: 'Paul'} });
    });

    it('keeps empty array sub-schemas empty', function() {
      var schema = createBlogSchema();
      schema.stripUnknownProperties({ author: { name: 'Paul' }, comments: []})
        .should.eql({ author: { name: 'Paul' },  comments: [] });
    });

    it('strips out properties from array sub-schemas', function() {
      var schema = createBlogSchema()
        , comment = createCommentSchema().makeBlank()
        ;
        comment.extra = 'Hello';
      schema.stripUnknownProperties({ author: { name: 'Paul' }, comments: [comment]})
        .should.eql({ author: { name: 'Paul' },  comments: [{ email: null, comment: null } ] });
    });

  });

  describe('#cast()', function() {

    it('converts types correctly', function() {
      var schema = createContactSchema();
      Object.keys(assertions).forEach(function(type) {
        // Even = expected, odd = supplied
        for(var i = 0; i < assertions[type].length; i += 2) {
          var cast;
          cast = schema.castProperty(typeMap[type], assertions[type][i + 1]);
          should.strictEqual(cast, assertions[type][i],
            'Failed to cast \'' + type + '\' (test ' + i + ') from \'' + assertions[type][i + 1] + '\' to \'' + assertions[type][i] + '\' instead got \'' + cast + '\'');
        }
      });
    });

    it('converts arrays correctly', function() {
      var schema = createArraySchema();
      [[], null, ''].forEach(function(value) {
        Array.isArray(schema.castProperty(Array, value)).should.equal(true);
        schema.castProperty(Array, value).should.have.lengthOf(0);
      });
      [[1], ['a']].forEach(function(value) {
        Array.isArray(schema.castProperty(Array, value)).should.equal(true);
        schema.castProperty(Array, value).should.have.lengthOf(1);
      });
    });

    it('converts object correctly', function() {
      var schema = createArraySchema();
      [null, '', 'hello', [], undefined].forEach(function(value) {
        Object.keys(schema.castProperty(Object, value)).should.have.lengthOf(0);
      });
      [{a:'b'}].forEach(function(value) {
        Object.keys(schema.castProperty(Object, value)).should.have.lengthOf(1);
      });
    });

    it('throws exception on unknown type', function() {
      var schema = createContactSchema();
      (function(){
        schema.castProperty(undefined);
      }).should.throwError();
    });

  });

  describe('#cast()', function() {

    it('converts number types of properties correctly', function() {
      var
        schema = createContactSchema(),
        type = 'number',
        cast;

      for(var i = 0; i < assertions[type].length; i += 2) {
        cast = schema.cast({ age: assertions[type][i + 1] });
        cast.should.eql({ age: assertions[type][i] },
          'Failed to cast \'' + type + '\' from \'' + assertions[type][i + 1] + '\' to \'' + assertions[type][i] + '\' instead got \'' + cast.age + '\' ' + JSON.stringify(cast));
      }
    });

    it('converts boolean types of properties correctly', function() {
    var
      schema = createContactSchema(),
      type = 'boolean',
      cast;

      for(var i = 0; i < assertions[type].length; i += 2) {
        cast = schema.cast({ active: assertions[type][i + 1] });
        cast.should.eql({
          active: assertions[type][i]
        }, 'Failed to cast \'' + type + '\' from \'' + assertions[type][i + 1] + '\' to \'' + assertions[type][i] + '\' instead got \'' + cast.active + '\'' + JSON.stringify(cast));
      }
    });

    it('does not effect untyped properties', function() {
      var schema = createContactSchema();
      schema.cast({ phoneNumber: '555-0923' }).should.eql({
        phoneNumber: '555-0923'
      });
    });

  });

  describe('#validate()', function() {

    it('does not error on schemas without validation', function(done) {
      var schema = createContactSchema();
      schema.validate(schema.makeDefault({ name: 'Paul' }), 'all', function(errors) {
        errors.should.eql({});
        done();
      });
    });

    it('returns error for missing property', function(done) {
      var schema = createContactSchema();

      schema.schema.name.should.not.have.property('validators');
      schema.schema.name.validators = {
        all: [validation.required.validate]
      };

      schema.validate(schema.makeDefault({ name: '' }), 'all', function(errors) {
        errors.should.eql({name:'Full Name is required'});
        done();
      });
    });

    it('uses the [all] set by default', function(done) {
      var schema = createContactSchema();

      schema.schema.name.validators = {
        all: [validation.required.validate]
      };

      schema.validate(schema.makeDefault({ name: '' }), '', function(errors) {
        errors.should.eql({name: 'Full Name is required'});
        done();
      });
    });

    it('returns error for missing property but not for valid property', function(done) {
      var schema = createContactSchema();

      schema.schema.name.validators = {
        all: [validation.required.validate]
      };

      schema.schema.age.validators = {
        all: [validation.required.validate]
      };

      schema.validate(schema.makeDefault({ name: '', age: 33 }), 'all', function(errors) {
        errors.should.eql({ name: "Full Name is required" });
        done();
      });
    });

    it('uses all validators', function(done) {
      var schema = createContactSchema();

      schema.schema.name.validators = {
        all: [validation.required.validate, validation.length(2, 4).validate]
      };

      schema.validate(schema.makeDefault({ name: 'A' }), 'all', function(errors) {
        errors.should.eql({name: "Full Name must be between 2 and 4 in length"});
        done();
      });
    });

    it('validates only for tag passed in', function(done) {
      var schema = createContactSchema();

      // Adding required validation to a schema property with a tag
      schema.schema.name.validators = {
        all: [validation.required.validate]
      };

      // Adding required validation to a schema property without a tag
      schema.schema.age.validators = {
        all: [validation.required.validate]
      };

      schema.validate(schema.makeBlank(), 'all', 'update', function(errors) {
        errors.should.eql({
          name: 'Full Name is required'
        });
        done();
      });
    });

    it('validates by tag and by set', function(done) {
      var schema = createContactSchema();

      schema.schema.name.validators = {
        all: [validation.required.validate]
      };

      schema.schema.name.tag = ['newTag'];

      schema.schema.age.validators = {
        all: [validation.required.validate]
      };

      schema.schema.age.tag = ['differentTag'];

      schema.validate(schema.makeBlank(), 'all', 'newTag', function(errors) {
        errors.should.eql({
          name: 'Full Name is required'
        });
        done();
      });

    });

    it('allows tag and set to be optional parameters', function(done) {
      var schema = createContactSchema();

      schema.schema.name.validators = {
        all: [validation.required.validate]
      };

      schema.schema.age.validators = {
        all: [validation.required.validate]
      };

      schema.validate(schema.makeBlank(), function(errors) {
        errors.should.eql({
          name: 'Full Name is required',
          age: 'Age is required'
        });
        done();
      });
    });

    it('Validates sub-schemas', function() {
      var schema = createBlogSchema();
      schema.schema.author.type.schema.age.validators = {
        all: [validation.required.validate]
      };
      schema.validate(schema.makeBlank(), function(errors) {
        errors.should.eql({ author: {
          age: 'Age is required'
        }});
      });
    });

    it('Validates sub-schemas property is not listed in errors when there are no errors', function() {
      var schema = createBlogSchema();
      schema.validate(schema.makeBlank(), function(errors) {
        errors.should.eql({});
      });
    });

    it('Validates any defined validators even on sub-schemas', function() {
      var schema = createBlogSchema();
      schema.schema.author.validators = {
        all: [createPropertyValidator(function(value, callback) {
          callback(false);
        }, 'Bad').validate]
      };
      schema.validate(schema.makeBlank(), function(errors) {
        errors.should.eql({ author: 'Bad' });
      });
    });

    it('validators failure should prevent sub-schema validation', function() {
      var schema = createBlogSchema();
      schema.schema.author.type.schema.age.validators = {
        all: [createPropertyValidator(function(value, callback) {
          'This should not get called'.should.equal(false);
          callback(false);
        }, 'This should not be seen').validate]
      };
      schema.schema.author.validators = {
        all: [createPropertyValidator(function(value, callback) {
          callback(false);
        }, 'From one of the Validators').validate]
      };
      schema.validate(schema.makeBlank(), function(errors) {
        errors.should.eql({ author: 'From one of the Validators' });
      });
    });

    it('Validates array sub-schemas', function() {
      //TODO:
    });

    it('allows error response to be a string instead of Error object', function(done) {
      var schema = createContactSchema()
        ;

      schema.schema.name.validators = {
        all: [function(name, value, callback) {
          return callback(value ? undefined : name + ' is required');
        }]
      };

      schema.validate(schema.makeDefault({ name: '' }), function(errors) {
        errors.should.eql({name:'Full Name is required'});
        done();
      });
    });

  });

  describe('#propertyName()', function() {

    it('returns name when available', function() {
      var schema = createContactSchema();
      schema.propertyName('name').should.equal('Full Name');
    });

    it('returns converted name', function() {
      var schema = createContactSchema();
      schema.propertyName('age').should.eql('Age');
    });

    it('throws error on unspecified property', function() {
      var
        schema = createContactSchema(),
        propertyName = 'Wobble';
      (function(){
        schema.propertyName(propertyName);
      }).should.throwError('No property \'' + propertyName + '\' in schema');
    });

  });

});