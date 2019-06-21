const isPrimitive = require('is-primitive')
const clone = require('lodash.clonedeep')
const SchemataArray = require('./lib/array')
const hasTag = require('./lib/has-tag')
const isSchemata = require('./lib/is-schemata')
const isSchemataArray = require('./lib/is-array')
const getType = require('./lib/type-getter')
const castArray = require('./lib/casters/array')
const castBoolean = require('./lib/casters/boolean')
const castDate = require('./lib/casters/date')
const castNumber = require('./lib/casters/number')
const castObject = require('./lib/casters/object')
const castString = require('./lib/casters/string')
const { validate, validateRecursive } = require('./lib/validate')
const convertCamelcaseToHuman = require('./lib/camelcase-to-human-converter')
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
const castProperty = (type, value, key, entityObject) => {
  if (type === undefined) throw new Error('Missing type')

  // First check whether the type of this property is
  // a sub-schema, or an array of sub-schemas

  const subSchema = getType(type, entityObject)
  if (isSchemata(subSchema)) {
    return value !== null ? subSchema.cast(value) : null
  }

  if (isSchemataArray(type)) {
    if (!value) return null
    if (!Array.isArray(value)) value = [value]
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
}

const createSchemata = ({ name, description, properties } = {}) => {
  if (name === undefined) throw new Error('name is required')
  const internalSchema = clone(properties || {})
  Object.keys(internalSchema).forEach(k => {
    if (!properties[k].defaultValue) return
    if (typeof properties[k].defaultValue === 'function') return
    if (isPrimitive(properties[k].defaultValue)) return
    throw new Error(
      `The defaultValue for the schema property "${k}" must be either a primitive value or a function`
    )
  })

  return {
    getName() {
      return name
    },
    getDescription() {
      return description
    },
    getProperties() {
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
    makeBlank() {
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
    makeDefault(existingEntity) {
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
        if (existingEntity !== undefined && existingEntity[key] !== undefined) {
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
    stripUnknownProperties(entityObject, tag, ignoreTagForSubSchemas) {
      /* jshint maxcomplexity: 10 */

      const newEntity = {}

      Object.keys(entityObject).forEach(key => {
        const property = internalSchema[key]
        let subSchemaTag

        // If the schema doesn't have this property, or if the property is in
        // the schema but doesn't have the given tag, don't keep it
        if (
          typeof property === 'undefined' ||
          !hasTag(internalSchema, key, tag)
        )
          return

        const type = getType(property.type, entityObject)

        // If the property is null, leave it alone
        if (entityObject[key] === null) {
          newEntity[key] = null
          return
        }

        // If the type is a schemata instance use its stripUnknownProperties() function
        if (isSchemata(type)) {
          subSchemaTag = ignoreTagForSubSchemas ? undefined : tag
          newEntity[key] = type.stripUnknownProperties(
            entityObject[key],
            subSchemaTag,
            ignoreTagForSubSchemas
          )
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
            newEntity[key][
              index
            ] = property.type.arraySchema.stripUnknownProperties(
              item,
              subSchemaTag,
              ignoreTagForSubSchemas
            )
          })
        }
      })

      return newEntity
    },

    /*
     * Casts all the properties in the given entityObject that are defined in the schema.
     * If tag is provided then only properties that are in the schema and have the given tag will be cast.
     */
    cast(entityObject, tag) {
      const newEntity = {}

      Object.keys(entityObject).forEach(key => {
        // Copy all properties
        newEntity[key] = entityObject[key]

        // Only cast properties in the schema and tagged, if tag is provided
        if (
          internalSchema[key] !== undefined &&
          internalSchema[key].type &&
          hasTag(internalSchema, key, tag)
        ) {
          newEntity[key] = castProperty(
            internalSchema[key].type,
            entityObject[key],
            key,
            entityObject
          )
        }
      })

      return newEntity
    },

    validate: validate(internalSchema),
    validateRecursive: validateRecursive(internalSchema),
    /*
     * Returns the human readable name for a particular property.
     */
    propertyName(property) {
      if (internalSchema[property] === undefined)
        throw new RangeError(`No property '${property}' in schema`)
      return internalSchema[property].name === undefined
        ? convertCamelcaseToHuman(property)
        : internalSchema[property].name
    }
  }
}

createSchemata.Array = SchemataArray
createSchemata.castProperty = castProperty
module.exports = createSchemata
