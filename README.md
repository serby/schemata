# entity-schema - Keep your business entities
Define and manage objects that represent you business entities

## Installation

	$ npm install entity-schema

## Usage

```js
var EntitySchema = require('entity-schema');

var schema = EntitySchema.({
	name: {
		tag: ['update'],
		name: 'Full Name'
	},
	age: {
		type: 'number',
		defaultValue: 0
	},
	active: {
		type: 'boolean',
		defaultValue: true
	},
	phoneNumber: {
		tag: ['update']
	}
});

var blank = schema.makeBlank();
// blank is now equal to:
//	{
//		name: null,
//		age: null,
//		active: null,
//		phoneNumber: null
//	}

var default = schema.makeDefault();
// default is now equal to:
//	{
//		name: null,
//		age: 0,
//		active: true,
//		phoneNumber: null
//	}

var stripped = schema.stripUnknownProperties({
	name: 'Dom',
	extra: 'This should not be here'
});
// stripped is now equal to:
//	{
//		name: 'Dom'
//	}
```

## Credits
[Paul Serby](https://github.com/serby/) follow me on [twitter](http://twitter.com/serby)
[Dom Harrington](https://github.com/domharrington/)

## Licence
Licenced under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
