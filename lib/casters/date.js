module.exports = castDate

function castDate(value) {
  return (value === '' || value === null || value === undefined)
    ? null
    : (value instanceof Date ? value : new Date(value))
}
