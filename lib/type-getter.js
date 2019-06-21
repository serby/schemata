const isSchemata = require('./is-schemata')

/*
 * Gets the type of a property. It either returns
 * a non-function (string, schemata instance) or it
 * calls a function. If that function returns a schemata
 * instance, that is returned. Else we return the type as is.
 */
const getType = (type, entityObject) => {
  if (typeof type !== 'function') return type

  const schemataInstance = type(entityObject)

  return isSchemata(schemataInstance) ? schemataInstance : type
}

module.exports = getType
