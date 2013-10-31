# schemata - Define, create, and validate your objects, based on specified schema.

[![NPM Details](https://nodei.co/npm/schemata.png?stars&downloads)](https://npmjs.org/package/schemata)

[![build status](https://api.travis-ci.org/serby/schemata.png)](http://travis-ci.org/serby/schemata)

schemata allows you to define schemas to ensure your objects are well formed. This is similar to the concept of a schema in [mongoose](http://mongoosejs.com/) but unlike mongoose schemata has nothing to do with data persistence. This lightweight decoupled approach gives the ultimate flexibility and freedom to use the module with in your application whether you are storing your objects or not.

## Installation

    npm install schemata

## Usage

### Creating a basic schema

```js
var schemata = require('schemata');

var contactSchema = schemata({
  name: {
    name: 'Full Name'
  },
  age: {
    type: Number
    defaultValue: 0
  },
  active: {
    type: Boolean,
    defaultValue: true
  },
  phoneNumber: { // If no type is given String will be assumed
  }
});
```

#### Schema Properties

* **name**: (optional) The friendly version of the property name. If omitted a decamlcased version of the property name will be used.
* **type**: (optional) The javascript type that the property value will be coerced into via the **cast()** and **castProperty()** functions. If this is omitted the property will be of type String. Type can be any of the following: String, Number, Boolean, Array, Object, Date or another instance of a schemata schema.
* **defaultValue**: (optional) The property value return when using **makeDefault()** If this is a function, it will be the return value.
* **tag[]**: (optional) Some functions such as **cast()** and **stripUnknownProperties()** take a tag option. If this is passed then only properties with that tag are processed.
* **validators{}**: (optional) A object containing all the validator set for this property. By default the validator set 'all' will be used by **validate()**. schemata gives you the ability defined any number of validator sets, so you can validate an object in different ways.

### Creating a new object

```js
var blank = contactSchema.makeBlank();
```
    {
      name: null,
      age: null,
      active: null,
      phoneNumber: null
    }

### Creating a new object with the default values

```js
var default = contactSchema.makeDefault();
```
    {
      name: null,
      age: 0,
      active: true,
      phoneNumber: null
    }
### Strip unknown properties from an object

Sometimes you've receive data from a POST or another IO operation that may have
more properties than your business object expect. **stripUnknownProperties**
will take an object and strip out any properties that aren't defined in the
schemata scheme.

```js
var stripped = contactSchema.stripUnknownProperties({
  name: 'Dom',
  extra: 'This should not be here'
});
```
    {
      name: 'Dom'
    }

### Validate an object against the schema

Validation is easy in schemata, just call **validate()** on your schema passing in the object to validate:

```js
contactSchema.validate(objectToValidate, function(errors){
  // errors
});
```

Validators are assigned to a field of the schema by adding them as an array to the **validators** property of the object as follows (this is an extension of the example at the top):

```js
name: {
  name: 'Full Name',
  validators: [validator1, validator2]
}
```

Validators are functions that have the following signature:

```js
function(propertyName, errorPropertyName, object, callback) {}
```

The callback must be called with a falsy value (such as undefined or null) if the validation passes, or with a string with the appropriate error message if it fails validation.

A full validator example:

```js
var required = function(propertyName, errorPropertyName, object, callback) {
  return callback(value ? undefined : errorPropertyName + ' is required');
};

name: {
  name: 'Full Name',
  validators: [required]
}
```

If any of the validators fail then the errors will be returned in the callback from **validate()** with the object key being the field name and the value being the error message.

For a comprehensive set of validators including: email, integer, string length, required & UK postcode. Check out [validity](https://github.com/serby/validity).

### Cast an object to the types defined in the schema

Type casting is done in schemata using the **cast()** and **castProperty()** functions. **cast()** is used for when you want to cast multiple properties against a schama, **castProperty()** is used if you want to cast one property and explicitly provide the type.

```js
var schemata = require('schemata');

var person = schemata({
  name: {
    type: String
  },
  age: {
    type: Number
  },
  active: {
    type: Boolean
  },
  birthday: {
    type: Date
  },
  friends: {
    type: Array
  },
  extraInfo: {
    type: Object
  }
});

var objectToCast = {
  name: 123456,
  age: '83',
  active: 'no',
  birthday: '13 February 1991',
  friends: '',
  extraInfo: undefined
};

var casted = person.cast(objectToCast);
// casted = {
//   name: '123456',
//   age: 83,
//   active: false,
//   birthday: Date('Wed Feb 13 1991 00:00:00 GMT+0000 (GMT)'),
//   friends: [],
//   extraInfo: {}
// }
```

### Get friendly name for property

If you want to output the name of a schema property in a human-readable format then you need the **propertyName()** function. If your schema field has a name attribute, then that is returned. If that is not set then the name is obtained by decamelcasing the field name.

Consider the following example:

```js
var schemata = require('schemata');

var address = schemata({
  addressLine1: {},
  addressLine2: {},
  addressLine3: {
    name: 'Town'
  },
  addressLine4: {
    name: 'Region'
  }
});

console.log(address.propertyName('addressLine1'));
// Returns 'Address Line 1' because there is no name set

console.log(address.propertyName('addressLine3'));
// Returns 'Town' because there is a name set
```

## Credits
[Paul Serby](https://github.com/serby/) follow me on twitter [@serby](http://twitter.com/serby)

[Dom Harrington](https://github.com/domharrington/)

## Licence
Licenced under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
