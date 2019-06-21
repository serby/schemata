/**
 * Has a property got a tag
 */
const hasTag = (schema, key, tag) => {
  // No tag specified
  if (tag === undefined) return true

  // This property has no tags
  if (schema[key].tag === undefined) return false
  if (!Array.isArray(schema[key].tag)) return false

  return schema[key].tag.indexOf(tag) !== -1
}

module.exports = hasTag
