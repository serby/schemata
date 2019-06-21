function castString(value) {
  if (value === undefined || value === '' || value === null) return null
  return value.toString && value.toString()
}

module.exports = castString
