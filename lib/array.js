module.exports = ArrayType

/*
 * Array helper to assist creation of nested array schemas
 */
function ArrayType(type) {

  if (typeof type !== 'function') return { arraySchema: type }

  if ([ Boolean, Number, String, Date, Object, Array ].indexOf(type) !== -1) {
    return (
      { makeBlank: function () { return [] }
      , stripUnknownProperties: function (item) { return item }
      , cast: function (value) { return value.map(type) }
      , validateRecursive: function () {}
      })
  }

  return { arraySchema: type() }

}
