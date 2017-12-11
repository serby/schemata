module.exports = ArrayType

/*
 * Array helper to assist creation of nested array schemas
 */
function ArrayType (schema) {
  return { arraySchema: typeof schema === 'function' ? schema() : schema }
}
