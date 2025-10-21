const bcrypt = require('bcrypt');

const storedHash = '$2b$10$.W0j6EFD5fJ9TlSttdW47uKtv7NuA4QCFGx5vKKde2CrNBiaRnlkm';
const testPassword = 'Admin@2024';

bcrypt.compare(testPassword, storedHash, (err, result) => {
  if (err) {
    console.log('Error:', err);
  } else {
    console.log('Password match:', result);
  }
});
