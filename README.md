# schemata - Define and manage objects that represent your business entities.

schemata allows you to define schemas to ensure your objects are well formed. This is similar to the concept of a schema in [mongoose](http://mongoosejs.com/) but unlike mongoose schemata has nothing to do with data persistence. This lightweight decoupled approach gives the ultimate flexibility and freedom to use the module with in your application.

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

### Get a properties friendly name

## Credits
[Paul Serby](https://github.com/serby/) follow me on [twitter](http://twitter.com/serby)

[Dom Harrington](https://github.com/domharrington/)

## Licence
Licenced under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
