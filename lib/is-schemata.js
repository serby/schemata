const expectedInterface = [ 'makeBlank', 'makeDefault', 'castProperty' ]
const isSchemata = obj => {
  // Schemata instances must be objects
  if (typeof obj !== 'object') return false
  return expectedInterface.every(func => obj[func] !== undefined)
}

module.exports = isSchemata
