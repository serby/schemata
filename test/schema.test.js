var schemata = require('../')

describe('#schema', function() {

  it('schema should be empty for a default schemata', function() {
    var empty = schemata()
    empty.schema.should.eql({})
  })

})
