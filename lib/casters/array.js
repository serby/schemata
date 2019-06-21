function castArray(value) {
  return value === '' || value === null || value === undefined
    ? []
    : Array.isArray(value)
    ? value
    : [value]
}

module.exports = castArray
