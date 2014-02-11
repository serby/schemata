var async = require('async')
  , stringUtils = require('piton-string-utils')
  ;

/**
 * Array helper to assist creation of nested array schemas
 *
 * @param {Object} schema schema to be used as array type
 * @return {Object} array schema object
 * @api public
 */
function ArrayType(schema) {
  return {
    arraySchema: typeof schema === 'function' ? schema() : schema
  };
}

module.exports = function(schema) {

  // Start with a blank schema to reduce error checking
  schema = schema || {};
 // schema = Object.freeze(schema);

  /**
   * Returns a new object with properties and default values from the schema definition.
   *
   * If existingEntity is passed then extends it with the default properties.
   *
   * @param {Object} existingEntity Object to extend
   * @return {Object} A blank object based on schema
   * @api public
   */
  function makeDefault(existingEntity) {
    var newEntity = makeBlank()
      ;

    Object.keys(schema).forEach(function(key) {
      var defaultValue = newEntity[key]
        , value = schema[key]
        ;

      // if value is a sub-schema, use its makeDefault function
      if (typeof value.type === 'object' && typeof value.type.makeDefault === 'function') {
        if ((existingEntity !== undefined) && (existingEntity[key] !== undefined)) {
          defaultValue = value.type.makeDefault(existingEntity[key]);
        } else {
          defaultValue = value.type.makeDefault();
        }
      // If an existingEntity is passed then use its values.
      // If it doesn't have that property then the default will be used.
      } else if ((existingEntity !== undefined) && (existingEntity[key] !== undefined)) {
        defaultValue = existingEntity[key];
      } else {
        switch (typeof value.defaultValue) {
        case 'undefined':
          defaultValue = newEntity[key];
          break;
        case 'function':
          defaultValue = value.defaultValue();
          break;
        default:
          defaultValue = value.defaultValue;
        }
      }

      newEntity[key] = defaultValue;
    });
    return newEntity;
  }


  /**
   * Returns an object with properties defined in schema but with empty values.
   *
   * The empty value will depend on the type:
   * - array = []
   * - object = {}
   * - string = null
   * - boolean = null
   * - integer = null
   * - real = null
   *
   * @return {Object} A blank object based on schema
   * @api public
   */
  function makeBlank() {
    var newEntity = {}
      ;

    Object.keys(schema).forEach(function(key) {
      var value = null
        , type = schema[key].type
        ;

      // If type is schema and has a makeBlank() then used that.
      if (typeof type === 'object') {
        if (typeof type.makeBlank === 'function') {
          value = type.makeBlank();
        } else if (type.arraySchema !== undefined) {
          value = [];
        } else {
          throw new Error('Invalid property type on \'' + key + '\'');
        }
      } else {
        switch (type) {
        case Object:
          value = {};
          break;
        case Array:
          value = [];
          break;
        }
      }
      newEntity[key] = value;
    });
    return newEntity;
  }

  /**
   * Has a property got a tag
   *
   * @return {Boolean}
   * @api private
   */
  function hasTag(schema, key, tag) {
    return (tag === undefined) || ((schema[key].tag !== undefined)
      && (schema[key].tag.indexOf(tag) !== -1));
  }

  /**
   * Takes an object and strips out properties not in the schema. If a tag is given
   * then only properties with that tag will remain.
   *
   * @param {Object} entityObject The object to strip
   * @param {String} tag Property tag to strip down to. If undefined all properties in the schema will be returned.
   * @return {Object} The stripped down object
   * @api public
   */
  function stripUnknownProperties(entityObject, tag, ignoreTagForSubSchemas) {
    /* jshint maxcomplexity: 7 */
    var newEntity = {}
      , subSchemaTag

    Object.keys(entityObject).forEach(function(key) {

      if ((typeof schema[key] !== 'undefined') && (hasTag(schema, key, tag))) {
        if (typeof schema[key].type !== 'undefined') {
          // This infers that there is a sub-schema
          if (typeof schema[key].type.stripUnknownProperties === 'function') {
            subSchemaTag = ignoreTagForSubSchemas ? undefined : tag
            return newEntity[key] = schema[key].type.stripUnknownProperties(
              entityObject[key], subSchemaTag, ignoreTagForSubSchemas);
          } else if ((typeof schema[key].type.arraySchema !== 'undefined')
          && (typeof schema[key].type.arraySchema.stripUnknownProperties === 'function')
          && (Array.isArray(entityObject[key]))) {
            // Here the property must be an array schema
            subSchemaTag = ignoreTagForSubSchemas ? undefined : tag
            entityObject[key].forEach(function(arrayItem, index) {
              entityObject[key][index] =
                schema[key].type.arraySchema.stripUnknownProperties(arrayItem, subSchemaTag, ignoreTagForSubSchemas);
            });
          }
        }
        newEntity[key] = entityObject[key];
      }
    });
    return newEntity;
  }

  /**
   * Casts a value to a given type.
   *
   * For booleans and integers; undefined, '', and null will all be cast to null
   * For array they will be converted to []
   * For object they will be converted to {}
   *
   * Throws error is type is undefined.
   *
   * @param {String} type The type you would like to cast value to
   * @param {Mixed} value The value to be cast
   * @api public
   */
  function castProperty(type, value) {

    /* jshint maxcomplexity:36 */

    if (type === undefined) throw new Error('Missing type')

    // First check whether the type of this property is
    // a sub-schema, or an array of sub-schemas
    if (type.schema) {
      // The { type: x } is a sub-schema
      return type.cast(value)
    } else if (type.arraySchema) {
      // The { type: x } is an array of sub-schemas
      if (!value) return null
      if (!Array.isArray(value)) value = [ value ]
      return value.map(function (v) {
        return type.arraySchema.cast(v)
      })
    }

    // If the { type: x } is a primitive constructor, use
    // cast the value based on which constructor is found

    switch (type) {
    case Boolean:
      if (value === undefined || value === '' || value === null) return null
      return !(value === false || value === 0 || value === '0' || value === 'false' || value === 'off' || value === 'no')
    case Number:
      if (value === undefined || value === '' || value === null) return null
      return +value
    case String:
      if (value === undefined || value === '' || value === null) return null
      return value.toString && value.toString()
    case Object:
      // typeof null === 'object', but null is an acceptable value
      return (typeof value !== 'object') ? {} : value
    case Date:
      return (value === '' || value === null || value === undefined) ? null : (value instanceof Date ? value : new Date(value))
    case Array:
      return (value === '' || value === null || value === undefined) ? [] : (Array.isArray(value) ? value : [value])
    default:
      return value
    }

  }

  /**
   * Casts all the properties in the given entityObject that are defined in the schema.
   * If tag is provided then only properties that are in the schema and have the given tag will be cast.
   *
   * @param {Object} entityObject The entity to cast properties on
   * @param {String} tag Which properties in the scheme to cast
   * @return {Object} A new object with cast properties
   * @api public
   */
  function cast(entityObject, tag) {
    var newEntity = {}
      ;

    Object.keys(entityObject).forEach(function(key) {
      // Copy all properties
      newEntity[key] = entityObject[key];

      // Only cast properties in the schema and tagged, if tag is provided
      if ((schema[key] !== undefined) && (schema[key].type) && (hasTag(schema, key, tag))) {
        newEntity[key] = castProperty(schema[key].type, entityObject[key]);
      }
    });

    return newEntity;
  }

  /**
   * Validates entity against the specified set, if set is not given the set 'all' will be assumed.
   *
   * @param {Object} entity The object to be validated
   * @param {Mixed} set Either the name or an array of names of the rules to validate entity against
   * @param {String} tag The tag to validate against (optional)
   * @param {Function} callback Called once validation is complete, passing an array either empty of containing errors
   * @api public
   */
  function validate(entityObject, set, tag, callback) {
    var errors = {}
      , processedSchema = schema
      ;

    // Allow set and tag arguments to be omitted
    if (typeof set === 'function') {
      callback = set;
      set = 'all';
      tag = undefined;
    // Allow optional tag parameter
    } else if (typeof tag === 'function') {
      callback = tag;
      set = 'all';
      tag = undefined;
    // If all parameters are present and reduce schema
    } else if (typeof callback === 'function') {
      var reducedSchema = {}
        ;
      Object.keys(schema).forEach(function(key) {
        if (hasTag(schema, key, tag)) {
          reducedSchema[key] = schema[key];
        }
      });
      processedSchema = reducedSchema;
    }

    // 'all' is reserved as the default validator set
    set = set || 'all';

    async.forEach(Object.keys(processedSchema), function(key, propertyCallback) {
      var property = processedSchema[key]
        , validateSubschemas = true
        ;

      async.series(
        [ function(seriesCallback) {
            if ((property.validators === undefined) || (property.validators[set] === undefined)) {
              return seriesCallback();
            }
            var validators = property.validators[set]
              , errorName = (property.name === undefined) ? stringUtils.decamelcase(key) : property.name
              ;

            async.forEach(validators, function(validator, validateCallback) {
              if (errors[key]) {
                return validateCallback();
              } else {

                validator(key, errorName, entityObject, function(error, valid) {
                  if (valid) {
                    errors[key] = valid;
                    validateSubschemas = false
                  }
                  validateCallback(error);
                });
              }

            }, function(error) {
              seriesCallback(error);
            });
          }
          , function(seriesCallback) {
            // This property has a subschema that needs validating
            if (!validateSubschemas) {
              seriesCallback()
            } else if ((typeof property.type !== 'undefined') && (typeof property.type.validate === 'function')) {

              return property.type.validate(entityObject[key], set, tag, function(error, subSchemaErrors) {
                if (Object.keys(subSchemaErrors).length > 0) {
                  errors[key] = subSchemaErrors;
                }
                seriesCallback(error);
              });
            } else {
              seriesCallback();
            }
          }
          , function(seriesCallback) {
            // This property has an array subschema that needs validating
            if (!validateSubschemas) {
              seriesCallback()
            } else if ((typeof property.type !== 'undefined')
                && (typeof property.type.arraySchema !== 'undefined')
                && entityObject[key]
                && entityObject[key].length > 0) {

              var index = 0

              async.forEach(entityObject[key], function (i, next) {
                property.type.arraySchema.validate(i, set, tag, function (error, subSchemaArrayErrors) {
                  if (Object.keys(subSchemaArrayErrors).length > 0) {
                    if (!errors[key]) errors[key] = {}
                    errors[key][index] = subSchemaArrayErrors;
                  }
                  index += 1
                  next(null)
                })
              }, function () {
                seriesCallback(errors[key] && errors[key].length > 1 ? errors : null)
              })
            } else {
              seriesCallback();
            }
          }
        ]
      , function(error) {
        propertyCallback(error === true ? undefined : error);
      });

    }, function(error) {
      callback(error === true ? undefined : error, errors);
    });
  }

  /**
   * Returns the human readable name for a particular property.
   *
   * @param {String} property The property to get the name of
   * @return {String} Either decamelcased property name, or name if set
   * @api public
   */
  function propertyName(property) {
    if (schema[property] === undefined) {
      throw new RangeError('No property \'' + property + '\' in schema');
    }
    return (schema[property].name === undefined) ? stringUtils.decamelcase(property) : schema[property].name;
  }

  return {
    schema: schema,
    makeDefault: makeDefault,
    makeBlank: makeBlank,
    hasTag: hasTag,
    stripUnknownProperties: stripUnknownProperties,
    castProperty: castProperty,
    cast: cast,
    validate: validate,
    propertyName: propertyName
  };
};

module.exports.Array = ArrayType;
