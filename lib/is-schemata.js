module.exports = isSchemata

const Schemata = require('../').Schemata

/*
 * Take an object and determine whether it is a schemata instance. This is
 * via duck typing because some people might choose to extend a schemata
 * in a way that breaks instanceof.
 */
function isSchemata (obj) {
  // Schemata instances must be objects
  if (typeof obj !== 'object') return false

  let is = true
  Object.keys(Schemata.prototype).forEach(k => {
    if (typeof obj[k] !== 'function') is = false
  })

  return is
}

// typeof property.type === 'object' && typeof property.type.makeDefault === 'function'
// typeof property.type.stripUnknownProperties === 'function'
// typeof type.makeBlank === 'function'
