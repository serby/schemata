var helpers = require('./helpers')
  , createContactSchema = helpers.createContactSchema

describe('#propertyName()', function() {

  it('returns name when available', function() {
    var schema = createContactSchema()
    schema.propertyName('name').should.equal('Full Name')
  })

  it('returns converted name', function() {
    var schema = createContactSchema()
    schema.propertyName('age').should.eql('Age')
  })

  it('throws error on unspecified property', function() {
    var schema = createContactSchema()
      , propertyName = 'Wobble';

    (function(){
      schema.propertyName(propertyName)
    }).should.throwError('No property \'' + propertyName + '\' in schema')
  })

})
