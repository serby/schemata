module.exports = castObject

function castObject(value) {
  // typeof null === 'object', but null is an acceptable value
  return (typeof value !== 'object') ? {} : value
}
