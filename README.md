# schemata - Define, create, and validate your business objects, based on specified schema.

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

```js
```

### Cast an object to the types defined in the schema

```js
```

### Get friendly name for property

```js
```

### Validate an object

```js
```

## Credits
[Paul Serby](https://github.com/serby/) follow me on twitter [@serby](http://twitter.com/serby)

[Dom Harrington](https://github.com/domharrington/)

## Licence
Licenced under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
