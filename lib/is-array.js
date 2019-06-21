const isSchemata = require('./is-schemata')
/*
 * Take an object and determine whether it is a schemata array type.
 */
const isArray = obj => {
  // Schemata array types must be objects
  if (typeof obj !== 'object') return false

  // Array types look like { arraySchema: <schemata> }
  return isSchemata(obj.arraySchema)
}

// (typeof property.type.arraySchema !== 'undefined') &&
// (typeof property.type.arraySchema.stripUnknownProperties === 'function')

module.exports = isArray
