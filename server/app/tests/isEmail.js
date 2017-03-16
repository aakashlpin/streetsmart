const isEmail = require('isemail');

const validEmail1 = 'aakash@gmail.com';
const invalidEmail1 = 'aakash@adjnask.com';

isEmail.validate(validEmail1, {
  checkDNS: true,
  errorLevel: true
}, (result) => {
  console.log({ email: validEmail1, result });
});

isEmail.validate(invalidEmail1, {
  checkDNS: true,
  errorLevel: true
}, (result) => {
  console.log({ email: invalidEmail1, result });
});
