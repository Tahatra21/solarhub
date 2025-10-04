const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = 'admin123'; // Default password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('🔐 Password hashing:');
  console.log(`Original password: ${password}`);
  console.log(`Hashed password: ${hashedPassword}`);
  console.log('');
  console.log('📝 SQL Update command:');
  console.log(`UPDATE public.tbl_user SET password = '${hashedPassword}' WHERE username = 'admin';`);
}

hashPassword();
