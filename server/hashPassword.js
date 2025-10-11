const bcrypt = require('bcryptjs');

// --- 1. SET THE PASSWORD YOU WANT TO USE ---
const plainTextPassword = 'admin123';

// --- 2. SET YOUR SALT ROUNDS (must match your app's signup logic) ---
const saltRounds = 10;

console.log(`Hashing password: ${plainTextPassword}`);

bcrypt.hash(plainTextPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('\n✅ Your new hashed password is:\n');
  console.log(hash);
  console.log('\nCopy the hash above and paste it into your MongoDB document.');
});