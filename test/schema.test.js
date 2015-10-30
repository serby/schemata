var schemata = require('../')

describe('#schema', function() {

  it('should default to an empty schemata', function() {
    var empty = schemata()
    empty.schema.should.eql({})
  })

  it('should throw an error if a defaultValue is neither a primitive value or a function', function () {

    var badSchemas =
          [ { a: { defaultValue: [] } }
          , { a: { defaultValue: {} } }
          , { a: { defaultValue: new Date() } }
          , { a: { defaultValue: 1 }, b: { defaultValue: [] } }
          ]
      , goodSchemas =
          [ { a: { defaultValue: function () { return [] } } }
          , { a: { defaultValue: null } }
          , { a: { defaultValue: undefined } }
          , { a: { defaultValue: 'Hi' } }
          , { a: { defaultValue: 20 } }
          ]

    badSchemas.forEach(function (s) {
      (function () { schemata(s) }).should.throw()
    })

    goodSchemas.forEach(function (s) {
      (function () { schemata(s) }).should.not.throw()
    })

  })

})
