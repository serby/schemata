module.exports = isSchemata

var requiredKeys = [ 'cast', 'stripUnknownProperties', 'validateRecursive', 'makeBlank' ]

/*
 * Take an object and determine whether it is a schemata instance. This is
 * via duck typing because some people might choose to extend a schemata
 * in a way that breaks instanceof.
 */
function isSchemata(obj) {

  // Schemata instances must be objects
  if (typeof obj !== 'object') return false

  // does it quack like a schemata?
  return !requiredKeys.some(function (k) {
    return typeof obj[k] !== 'function'
  })

}
