var d
module.exports =
  { typeMap:
    { 'string': String
    , 'number': Number
    , 'boolean': Boolean
    , 'object': Object
    , 'array': Array
    , 'date': Date
    }
  , assertions:
    { string:
      [ '1', [ 1 ]
      , '2', [ 2 ]
      ]
    , number: [ 382, 382, 245, '245', 831.3, 831.3, 831.3, '831.3', null, null, null, '' ]
    , boolean:
      [ true, true, true, 1, true, 't', true, 'true', true, 'on'
      , true, 'yes', false, false, false, 'false', false, 0, false
      , 'off', false, 'no', null, null, null, ''
      ]
    , date: [ null, null, d = new Date(), d ]
  }
}
