module.exports = castArray

function castArray(value) {
  return (value === '' || value === null || value === undefined) ? [] : (Array.isArray(value) ? value : [ value ])
}
