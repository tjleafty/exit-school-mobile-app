const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log('Password:', password);
  console.log('Hashed Password:', hashedPassword);
  return hashedPassword;
}

// Hash the super user password
hashPassword('password').catch(console.error);