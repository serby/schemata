const SchemataArray = require('./lib/array')
const hasTag = require('./lib/has-tag')
const isSchemata = require('./lib/is-schemata')
const isSchemataArray = require('./lib/is-array')
const getType = require('./lib/get-type')
const castArray = require('./lib/casters/array')
const castBoolean = require('./lib/casters/boolean')
const castDate = require('./lib/casters/date')
const castNumber = require('./lib/casters/number')
const castObject = require('./lib/casters/object')
const castString = require('./lib/casters/string')
const async = require('async')
const stringUtils = require('piton-string-utils')
const isPrimitive = require('is-primitive')
const clone = require('lodash.clonedeep')

const createSchemata = schema => {
  const internalSchema = clone(schema || {})
  Object.keys(internalSchema).forEach(k => {
    if (!schema[k].defaultValue) return
    if (typeof schema[k].defaultValue === 'function') return
    if (isPrimitive(schema[k].defaultValue)) return
    throw new Error(`The defaultValue for the schema property "${k}" must be either a primitive value or a function`)
  })

  return {
    getProperties () {
      return clone(internalSchema)
    },
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
    makeBlank () {
      const newEntity = {}

      Object.keys(internalSchema).forEach(key => {
        const type = getType(internalSchema[key].type)

        if (typeof type === 'object') {
          // If the type is a schemata instance use its makeBlank() function
          if (isSchemata(type)) {
            newEntity[key] = type.makeBlank()
            return null
          }

          // If the type is a schemata array, create an empty array
          if (isSchemataArray(type)) {
            newEntity[key] = []
            return null
          }

          throw new Error(`Invalid property type on '${key}'`)
        }

        switch (type) {
          case Object:
            newEntity[key] = {}
            return null
          case Array:
            newEntity[key] = []
            return null
          default:
            newEntity[key] = null
        }
      })

      return newEntity
    },

    /*
    * Returns a new object with properties and default values from the schema definition.
    * If existingEntity is passed then extends it with the default properties.
    */
    makeDefault (existingEntity) {
      const newEntity = this.makeBlank()

      if (!existingEntity) existingEntity = {}

      Object.keys(internalSchema).forEach(key => {
        const property = internalSchema[key]
        const existingValue = existingEntity[key]
        const type = getType(property.type, existingEntity)

        // If an existingEntity is passed then use its value
        // If it doesn't have that property then the default will be used.
        // If an existingEntity is a schemata instance it's own makeDefault() will
        // also be called so that partial sub-objects can be used.
        if ((existingEntity !== undefined) && (existingEntity[key] !== undefined)) {
          newEntity[key] = isSchemata(type)
            ? type.makeDefault(existingValue)
            : existingEntity[key]
          return
        }

        switch (typeof property.defaultValue) {
          case 'undefined':
          // If the property is a schemata instance use its makeDefault() function
            if (isSchemata(type)) {
              newEntity[key] = type.makeDefault(existingValue)
              return
            }
            // In the absence of a defaultValue property the makeBlank() value is used
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
        }
      })

      return newEntity
    },

    /*
    * Takes an object and strips out properties not in the schema. If a tag is given
    * then only properties with that tag will remain.
    */
    stripUnknownProperties (entityObject, tag, ignoreTagForSubSchemas) {
      /* jshint maxcomplexity: 10 */

      const newEntity = {}

      Object.keys(entityObject).forEach(key => {
        const property = internalSchema[key]
        let subSchemaTag

        // If the schema doesn't have this property, or if the property is in
        // the schema but doesn't have the given tag, don't keep it
        if (typeof property === 'undefined' || !hasTag(internalSchema, key, tag)) return

        const type = getType(property.type, entityObject)

        // If the property is null, leave it alone
        if (entityObject[key] === null) {
          newEntity[key] = null
          return
        }

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
          entityObject[key].forEach((item, index) => {
            newEntity[key][index] =
              property.type.arraySchema.stripUnknownProperties(item, subSchemaTag, ignoreTagForSubSchemas)
          })
        }
      })

      return newEntity
    },

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
    castProperty (type, value, key, entityObject) {
      if (type === undefined) throw new Error('Missing type')

      // First check whether the type of this property is
      // a sub-schema, or an array of sub-schemas

      const subSchema = getType(type, entityObject)
      if (isSchemata(subSchema)) {
        return value !== null ? subSchema.cast(value) : null
      }

      if (isSchemataArray(type)) {
        if (!value) return null
        if (!Array.isArray(value)) value = [ value ]
        return value.map(v => type.arraySchema.cast(v))
      }

      // If the { type: x } is a primitive constructor, use
      // cast the value based on which constructor is found

      // JSHint doesn't like switch statements!
      /* jshint maxcomplexity: 13 */
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
    },

    /*
    * Casts all the properties in the given entityObject that are defined in the schema.
    * If tag is provided then only properties that are in the schema and have the given tag will be cast.
    */
    cast (entityObject, tag) {
      const newEntity = {}

      Object.keys(entityObject).forEach(key => {
        // Copy all properties
        newEntity[key] = entityObject[key]

        // Only cast properties in the schema and tagged, if tag is provided
        if (internalSchema[key] !== undefined && internalSchema[key].type && hasTag(internalSchema, key, tag)) {
          newEntity[key] = this.castProperty(internalSchema[key].type, entityObject[key], key, entityObject)
        }
      })

      return newEntity
    },

    /*
    * Get arguments for validate and sets parent for this validation
    * Then begins recursive validation, if set is not given the set 'all' will be assumed.
    */
    validate () /* entityObject, set, tag, callback */{
      let entityObject
      let set
      let tag
      let callback
      const validateStrategy = validateArgumentStrategies()
      let properties

      if (validateStrategy.hasOwnProperty(arguments.length)) {
        properties = validateStrategy[arguments.length](arguments)
        entityObject = properties.entityObject
        set = properties.set
        tag = properties.tag
        callback = properties.callback
      } else {
        throw new Error('Validate called with a bad number of arguments')
      }
      if (typeof callback === 'function') {
        this.validateRecursive(entityObject, entityObject, set, tag, callback)
      } else {
        return new Promise((resolve, reject) => {
          this.validateRecursive(entityObject, entityObject, set, tag, (err, errors) => {
            if (err) return reject(err)
            resolve(errors)
          })
        })
      }
    },

    /*
    * Recursively validates entity against the specified set, if set is not given the set 'all' will be assumed.
    */
    validateRecursive (parent, entityObject, set, tag, callback) {
      const errors = {}
      const processedSchema = {}

      // Only validate the properties with the given tag
      Object.keys(internalSchema).forEach(key => {
        if (hasTag(internalSchema, key, tag)) processedSchema[key] = internalSchema[key]
      })

      async.forEach(Object.keys(processedSchema), async.setImmediate.bind(async, validateProperty), error => {
        callback(error === true ? undefined : error, errors)
      })

      /*
      * Run validation on a single property
      */
      function validateProperty (key, propertyCallback) {
        const property = processedSchema[key]
        let validateSubschemas = true

        async.series([ validateSimpleProperty, validateSubschema, validateArraySchema ], error => {
          propertyCallback(error === true ? undefined : error)
        })

        /*
        * Validate a property with a primitive type
        */
        function validateSimpleProperty (cb) {
          // This allows for validator to simply be an array. New in v3.1!
          const validators = Array.isArray(property.validators) &&
              set === 'all' ? property.validators : property.validators && property.validators[set]

          const errorName = property.name === undefined ? stringUtils.decamelcase(key) : property.name

          // This property has no validators, or none specified for the given set
          if (validators === undefined || !Array.isArray(validators)) return cb()

          async.forEach(validators, (validator, validateCallback) => {
            if (errors[key]) return validateCallback()
            if (validator.length === 5) {
              validator(key, errorName, entityObject, parent, (error, valid) => {
                if (error) return validateCallback(error)
                if (valid) {
                  errors[key] = valid
                  validateSubschemas = false
                }
                validateCallback()
              })
            } else {
              validator(key, errorName, entityObject, (error, valid) => {
                if (error) return validateCallback(error)
                if (valid) {
                  errors[key] = valid
                  validateSubschemas = false
                }
                validateCallback()
              })
            }
          }, error => {
            cb(error)
          })
        }

        /*
        * Validate a property with a schemata as its type
        */
        function validateSubschema (cb) {
          if (!validateSubschemas) return cb()

          const type = getType(property.type, entityObject)

          // In order to validate, type must be a schemata instance
          if (!isSchemata(type)) return cb()

          if (!entityObject[key]) return cb()

          return type.validateRecursive(parent, entityObject[key], set, tag, (error, subSchemaErrors) => {
            if (Object.keys(subSchemaErrors).length > 0) errors[key] = subSchemaErrors
            cb(error)
          })
        }

        /*
        * Validate a property with a schemata array as its type
        */
        function validateArraySchema (cb) {
          if (!validateSubschemas) return cb()

          // In order to validate, type must be a schemata array and the property must be an array with length
          if (!isSchemataArray(property.type) || !Array.isArray(entityObject[key]) || !entityObject[key].length) return cb()

          async.times(entityObject[key].length, validateArrayItemSchema, () => cb(errors[key] && errors[key].length > 1 ? errors : null))

          function validateArrayItemSchema (i, itemCb) {
            const value = entityObject[key][i]

            property.type.arraySchema.validateRecursive(parent, value, set, tag, (error, subSchemaArrayErrors) => {
              if (error) return itemCb(error)
              if (Object.keys(subSchemaArrayErrors).length > 0) {
                if (!errors[key]) errors[key] = {}
                errors[key][i] = subSchemaArrayErrors
              }
              itemCb()
            })
          }
        }
      }
    },

    /*
    * Returns the human readable name for a particular property.
    */
    propertyName (property) {
      if (internalSchema[property] === undefined) throw new RangeError(`No property '${property}' in schema`)
      return (internalSchema[property].name === undefined) ? stringUtils.decamelcase(property) : internalSchema[property].name
    }
  }
}

function validateArgumentStrategies () {
  function two (validateArgs) {
    const properties = {}
    const arg = validateArgs[1]
    properties.entityObject = validateArgs[0]
    properties.set = typeof arg !== 'function' ? arg : 'all'
    properties.tag = undefined
    properties.callback = arg
    return properties
  }
  function three (validateArgs) {
    const arg = validateArgs[2]
    const properties = {}
    properties.entityObject = validateArgs[0]
    properties.set = validateArgs[1] || 'all'
    properties.tag = typeof arg === 'function' ? undefined : arg
    properties.callback = arg
    return properties
  }
  function four (validateArgs) {
    const properties = {}
    properties.entityObject = validateArgs[0]
    properties.set = validateArgs[1] || 'all'
    properties.tag = validateArgs[2]
    properties.callback = validateArgs[3]
    return properties
  }
  return {
    '1': two,
    '2': two,
    '3': three,
    '4': four
  }
}
createSchemata.Array = SchemataArray

module.exports = createSchemata
