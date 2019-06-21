const convertCamelcaseToHuman = (value, delimiter = ' ') =>
  value.substring(0, 1).toUpperCase() +
  value
    .substring(1)
    .replace(/([^\s0-9])([A-Z0-9])/g, ($0, $1, $2) => $1 + delimiter + $2)

module.exports = convertCamelcaseToHuman
