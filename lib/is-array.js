module.exports = isArray

var isSchemata = require('./is-schemata')
/*
 * Take an object and determine whether it is a schemata array type.
 */
function isArray(obj) {

  // Schemata array types must be objects
  if (typeof obj !== 'object') return false

  // Array types look like { arraySchema: <schemata> }
  if (isSchemata(obj.arraySchema)) return true

  return false

}
