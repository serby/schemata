module.exports.blog = {
  title: null,
  body: null,
  author: {
    name: 'test',
    age: 0,
    active: true,
    phoneNumber: null,
    dateOfBirth: null
  },
  comments: []
}

module.exports.expectedParents = [
  {
    title: null,
    body: null,
    author: {
      name: 'Terry Pratchett',
      age: 66,
      active: false,
      phoneNumber: null,
      dateOfBirth: null
    },
    comments: []
  },
  {
    title: null,
    body: null,
    author: {
      name: 'Stephen King',
      age: 68,
      active: true,
      phoneNumber: null,
      dateOfBirth: null
    },
    comments: []
  }
]
