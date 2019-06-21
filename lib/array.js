/*
 * Array helper to assist creation of nested array schemas
 */
const ArrayType = schema => ({
  arraySchema: typeof schema === 'function' ? schema() : schema
})

module.exports = ArrayType
