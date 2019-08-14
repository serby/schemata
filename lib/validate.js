const promisify = require('util.promisify')
const hasTag = require('./has-tag')
const isSchemata = require('./is-schemata')
const isSchemataArray = require('./is-array')
const getType = require('./type-getter')
const convertCamelcaseToHuman = require('./camelcase-to-human-converter')

const validateArgumentStrategies = () => {
  function two(validateArgs) {
    const properties = {}
    const arg = validateArgs[1]
    properties.entityObject = validateArgs[0]
    properties.set = typeof arg !== 'function' ? arg : 'all'
    properties.tag = undefined
    properties.callback = arg
    return properties
  }
  function three(validateArgs) {
    const arg = validateArgs[2]
    const properties = {}
    properties.entityObject = validateArgs[0]
    properties.set = validateArgs[1] || 'all'
    properties.tag = undefined
    properties.callback = arg
    return properties
  }
  function four(validateArgs) {
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

/*
 * Validate a property with a schemata as its type
 */
const validateSubschema = async (entityObject, propertyName, property, set) => {
  const type = getType(property.type, entityObject)

  // In order to validate, type must be a schemata instance
  if (!isSchemata(type)) return
  if (!entityObject[propertyName]) return
  const errors = await type.validateRecursive(
    entityObject[propertyName],
    set,
    undefined,
    entityObject
  )
  if (Object.keys(errors).length > 0) {
    return { [propertyName]: errors }
  }
  return {}
}

/*
 * Validate a property with a schemata array as its type
 */
const validateArraySchema = async (
  entityObject,
  propertyName,
  property,
  set
) => {
  // In order to validate, type must be a schemata array and the property must be an array with length
  if (
    !isSchemataArray(property.type) ||
    !Array.isArray(entityObject[propertyName]) ||
    !entityObject[propertyName].length
  )
    return
  const arrayErrors = {}
  for (let i = 0; i < entityObject[propertyName].length; i++) {
    const errors = await property.type.arraySchema.validateRecursive(
      entityObject[propertyName][i],
      set,
      undefined,
      entityObject
    )
    if (Object.keys(errors).length > 0) {
      arrayErrors[i] = errors
    }
  }
  if (Object.keys(arrayErrors).length > 0) {
    return { [propertyName]: arrayErrors }
  }
  return {}
}

/*
 * Validate a property with a primitive type
 */
const validateSimpleProperty = async (
  entityObject,
  propertyName,
  property,
  set = 'all',
  parent
) => {
  const validators =
    Array.isArray(property.validators) && set === 'all'
      ? property.validators
      : property.validators && property.validators[set]

  const errorName =
    property.name === undefined
      ? convertCamelcaseToHuman(propertyName)
      : property.name

  // This property has no validators, or none specified for the given set
  if (validators === undefined || !Array.isArray(validators)) return
  const promises = validators.map(validator => {
    if (validator.length === 3) {
      const response = validator(propertyName, errorName, entityObject)
      if (response instanceof Promise) {
        return response
      } else {
        return new Promise(resolve => resolve(response))
      }
    } else if (validator.length === 5) {
      return promisify(validator)(propertyName, errorName, entityObject, parent)
    } else if (validator.length === 4) {
      return promisify(validator)(propertyName, errorName, entityObject)
    }
  })

  for (let promise of promises) {
    const invalid = await promise
    if (invalid) {
      return { [propertyName]: invalid }
    }
  }
  return false
}

/*
 * Run validation on a single property
 */
const validateProperty = async (
  entityObject,
  propertyName,
  property,
  set,
  parent
) => {
  const response = await validateSimpleProperty(
    entityObject,
    propertyName,
    property,
    set,
    parent
  )
  if (response) {
    return response
  }
  const subSchemaResponse = await validateSubschema(
    entityObject,
    propertyName,
    property,
    set
  )
  if (subSchemaResponse) {
    return subSchemaResponse
  }
  const arraySchemaResponse = await validateArraySchema(
    entityObject,
    propertyName,
    property,
    set,
    parent
  )
  if (arraySchemaResponse) {
    return arraySchemaResponse
  }
  return {}
}

/*
 * Recursively validates entity against the specified set, if set is not given the set 'all' will be assumed.
 */
const validateRecursive = internalSchema => async (
  entityObject,
  set,
  tag,
  parent
) => {
  // Only validate the properties with the given tag
  const filteredProperties = Object.keys(internalSchema).reduce(
    (propertiesNames, propertyName) => {
      if (hasTag(internalSchema, propertyName, tag)) {
        propertiesNames.push(propertyName)
      }
      return propertiesNames
    },
    []
  )
  return (await Promise.all(
    filteredProperties.map(propertyName =>
      validateProperty(
        entityObject,
        propertyName,
        internalSchema[propertyName],
        set,
        parent || entityObject
      )
    )
  )).reduce((errors, validationError) => {
    if (!validationError) return errors
    return { ...errors, ...validationError }
  }, {})
}
const validate = internalSchema => async (...args) => {
  let entityObject
  let set
  let tag
  let callback
  const validateStrategy = validateArgumentStrategies()
  let properties
  if (validateStrategy.hasOwnProperty(args.length)) {
    properties = validateStrategy[args.length]([...args])
    entityObject = properties.entityObject
    set = properties.set
    tag = properties.tag
    callback = properties.callback
  } else {
    throw new Error('Validate called with a bad number of arguments')
  }
  if (typeof callback === 'function') {
    validateRecursive(internalSchema)(entityObject, set, tag)
      .then(response => callback(null, response))
      .catch(callback)
  } else {
    return validateRecursive(internalSchema)(entityObject, set, tag)
  }
}

module.exports = { validate, validateRecursive }
