import bcrypt from 'bcrypt';

const storedHash = '$2b$10$.W0j6EFD5fJ9TlSttdW47uKtv7NuA4QCFGx5vKKde2CrNBiaRnlkm';
const testPassword = 'Admin@2024';

const result = await bcrypt.compare(testPassword, storedHash);
console.log('Password "Admin@2024" matches stored hash:', result);
