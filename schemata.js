module.exports = createSchemata
module.exports.Schemata = Schemata
module.exports.Array = require('./lib/array')

var hasTag = require('./lib/has-tag')
  , isSchemata = require('./lib/is-schemata')
  , isSchemataArray = require('./lib/is-array')
  , getType = require('./lib/get-type')

  , castArray = require('./lib/casters/array')
  , castBoolean = require('./lib/casters/boolean')
  , castDate = require('./lib/casters/date')
  , castNumber = require('./lib/casters/number')
  , castObject = require('./lib/casters/object')
  , castString = require('./lib/casters/string')

  , async = require('async')
  , stringUtils = require('piton-string-utils')

function createSchemata(schema) {
  return new Schemata(schema)
}

function Schemata(schema) {
  this.schema = schema || {}
}

/*
 * Returns an object with properties defined in schema but with empty values.
 *
 * The empty value will depend on the type:
 * - Array = []
 * - Object = {}
 * - String = null
 * - Boolean = null
 * - Number = null
 */
Schemata.prototype.makeBlank = function () {

  var newEntity = {}

  Object.keys(this.schema).forEach(function (key) {

    var type = getType(this.schema[key].type)

    if (typeof type === 'object') {

      // If the type is a schemata instance use its makeBlank() function
      if (isSchemata(type)) {
        newEntity[key] = type.makeBlank()
        return
      }

      // If the type is a schemata array, create an empty array
      if (isSchemataArray(type)) {
        newEntity[key] = []
        return
      }

      throw new Error('Invalid property type on \'' + key + '\'')

    }

    switch (type) {
    case Object:
      newEntity[key] = {}
      return
    case Array:
      newEntity[key] = []
      return
    default:
      newEntity[key] = null
      return
    }

  }.bind(this))

  return newEntity

}

/*
 * Returns a new object with properties and default values from the schema definition.
 * If existingEntity is passed then extends it with the default properties.
 */
Schemata.prototype.makeDefault = function (existingEntity) {

  var newEntity = this.makeBlank()

  if (!existingEntity) existingEntity = {}

  Object.keys(this.schema).forEach(function (key) {

    var property = this.schema[key]
      , existingValue = existingEntity[key]
      , type = getType(property.type, existingEntity)

    // If the property is a schemata instance use its makeDefault() function
    if (isSchemata(type)) {
      newEntity[key] = type.makeDefault(existingValue)
      return
    }

    // If an existingEntity is passed then use its value
    // If it doesn't have that property then the default will be used.
    if ((existingEntity !== undefined) && (existingEntity[key] !== undefined)) {
      newEntity[key] = existingEntity[key]
      return
    }

    switch (typeof property.defaultValue) {
    case 'undefined':
      // In the absense of a defaultValue property the makeBlank() value is used
      return
    case 'function':
      // In the case of a defaultValue() function, run it to create the default
      // value. This is important when using mutable values like Object and Array
      // which would be a reference to the schema's property if it were set as
      // property.defaultValue = Object|Array|Date
      newEntity[key] = property.defaultValue()
      return
    default:
      // If defaultValue is a primitive value use it as-is
      newEntity[key] = property.defaultValue
      return
    }

  }.bind(this))

  return newEntity

}

/*
 * Takes an object and strips out properties not in the schema. If a tag is given
 * then only properties with that tag will remain.
 */
Schemata.prototype.stripUnknownProperties = function (entityObject, tag, ignoreTagForSubSchemas) {

  /* jshint maxcomplexity: 9 */

  var newEntity = {}

  Object.keys(entityObject).forEach(function (key) {

    var property = this.schema[key]
      , subSchemaTag

    // If the schema doesn't have this property, or if the property is in
    // the schema but doesn't have the given tag, don't keep it
    if (typeof property === 'undefined' || !hasTag(this.schema, key, tag)) return

    var type = getType(property.type, entityObject)

    // If the type is a schemata instance use its stripUnknownProperties() function
    if (isSchemata(type)) {
      subSchemaTag = ignoreTagForSubSchemas ? undefined : tag
      newEntity[key] = type.stripUnknownProperties(entityObject[key], subSchemaTag, ignoreTagForSubSchemas)
      return
    }

    // If this property is of a primitive type, keep it as is
    if (typeof property.type !== 'object') {
      newEntity[key] = entityObject[key]
      return
    }

    // If the type is a schemata array, call stripUnknownProperties() on each item in the array
    if (isSchemataArray(property.type)) {

      // The array can't be processed if it's not an array
      if (!Array.isArray(entityObject[key])) return

      // Create a new array to copy items over to
      newEntity[key] = []

      subSchemaTag = ignoreTagForSubSchemas ? undefined : tag
      entityObject[key].forEach(function (item, index) {
        newEntity[key][index] =
          property.type.arraySchema.stripUnknownProperties(item, subSchemaTag, ignoreTagForSubSchemas)
      }.bind(this))

    }

  }.bind(this))

  return newEntity

}

/**
 * Casts a value to a given type.
 *
 * For booleans and integers; undefined, '', and null will all be cast to null
 * For array they will be converted to []
 * For object they will be converted to {}
 *
 * Throws error if type is undefined.
 *
 */
Schemata.prototype.castProperty = function (type, value) {

  if (type === undefined) throw new Error('Missing type')

  // First check whether the type of this property is
  // a sub-schema, or an array of sub-schemas

  var subSchema = getType(type, value)
  if (isSchemata(subSchema)) return subSchema.cast(value)

  if (isSchemataArray(type)) {
    if (!value) return null
    if (!Array.isArray(value)) value = [ value ]
    return value.map(function (v) {
      return type.arraySchema.cast(v)
    })
  }

  // If the { type: x } is a primitive constructor, use
  // cast the value based on which constructor is found

  // JSHint doesn't like switch statements!
  /* jshint maxcomplexity: 12 */
  switch (type) {
  case Boolean:
    return castBoolean(value)
  case Number:
    return castNumber(value)
  case String:
    return castString(value)
  case Object:
    return castObject(value)
  case Date:
    return castDate(value)
  case Array:
    return castArray(value)
  default:
    return value
  }

}

/*
 * Casts all the properties in the given entityObject that are defined in the schema.
 * If tag is provided then only properties that are in the schema and have the given tag will be cast.
 */
Schemata.prototype.cast = function (entityObject, tag) {

  var newEntity = {}

  Object.keys(entityObject).forEach(function(key) {

    // Copy all properties
    newEntity[key] = entityObject[key]

    // Only cast properties in the schema and tagged, if tag is provided
    if (this.schema[key] !== undefined && this.schema[key].type && hasTag(this.schema, key, tag)) {
      newEntity[key] = this.castProperty(this.schema[key].type, entityObject[key])
    }

  }.bind(this))

  return newEntity
}

/*
 * Validates entity against the specified set, if set is not given the set 'all' will be assumed.
 */
Schemata.prototype.validate = function (/*entityObject, set, tag, callback*/) {

  var errors = {}
    , processedSchema = {}

    , entityObject
    , set
    , tag
    , callback

  switch (arguments.length) {
  case 2:
    entityObject = arguments[0]
    set = 'all'
    tag = undefined
    callback = arguments[1]
    break
  case 3:
    entityObject = arguments[0]
    set = arguments[1] || 'all'
    tag = undefined
    callback = arguments[2]
    break
  case 4:
    entityObject = arguments[0]
    set = arguments[1] || 'all'
    tag = arguments[2]
    callback = arguments[3]
    break
  default:
    throw new Error('Validate called with a bad number of arguments')
  }

  // Only validate the properties with the given tag
  Object.keys(this.schema).forEach(function(key) {
    if (hasTag(this.schema, key, tag)) processedSchema[key] = this.schema[key]
  }.bind(this))

  async.forEach(Object.keys(processedSchema), validateProperty, function (error) {
    callback(error === true ? undefined : error, errors)
  })

  /*
   * Run validation on a single property
   */
  function validateProperty(key, propertyCallback) {

    var property = processedSchema[key]
      , validateSubschemas = true

    async.series([ validateSimpleProperty, validateSubschema, validateArraySchema ], function (error) {
      propertyCallback(error === true ? undefined : error)
    })

    /*
     * Validate a property with a primitive type
     */
    function validateSimpleProperty(cb) {

      // This property has no validators, or none specified for the given set
      if (property.validators === undefined || !Array.isArray(property.validators[set])) return cb()

      var validators = property.validators[set]
        , errorName = property.name === undefined ? stringUtils.decamelcase(key) : property.name

      async.forEach(validators, function (validator, validateCallback) {
        if (errors[key]) return validateCallback()
        validator(key, errorName, entityObject, function (error, valid) {
          if (valid) {
            errors[key] = valid
            validateSubschemas = false
          }
          validateCallback(error)
        })

      }, function(error) {
        cb(error)
      })

    }

    /*
     * Validate a property with a schemata as its type
     */
    function validateSubschema(cb) {

      if (!validateSubschemas) return cb()

      var type = getType(property.type, entityObject)

      // In order to validate, type must be a schemata instance
      if (!isSchemata(type)) return cb()

      return type.validate(entityObject[key], set, tag, function (error, subSchemaErrors) {
        if (Object.keys(subSchemaErrors).length > 0) errors[key] = subSchemaErrors
        cb(error)
      })

    }

    /*
     * Validate a property with a schemata array as its type
     */
    function validateArraySchema(cb) {

      if (!validateSubschemas) return cb()

      // In order to validate, type must be a schemata array and the property must be an array with length
      if (!isSchemataArray(property.type) || !Array.isArray(entityObject[key]) || !entityObject[key].length) return cb()

      var index = 0
      async.forEachSeries(entityObject[key], function (value, cb) {
        property.type.arraySchema.validate(value, set, tag, function (error, subSchemaArrayErrors) {
          if (Object.keys(subSchemaArrayErrors).length > 0) {
            if (!errors[key]) errors[key] = {}
            errors[key][index] = subSchemaArrayErrors
          }
          index += 1
          cb()
        })
      }, function () {
        cb(errors[key] && errors[key].length > 1 ? errors : null)
      })

    }

  }

}

/*
 * Returns the human readable name for a particular property.
 */
Schemata.prototype.propertyName = function (property) {
  if (this.schema[property] === undefined) throw new RangeError('No property \'' + property + '\' in schema')
  return (this.schema[property].name === undefined) ? stringUtils.decamelcase(property) : this.schema[property].name
}
