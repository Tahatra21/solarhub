const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function resetAdminPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 RESETTING ADMIN PASSWORD');
    console.log('============================');
    console.log('');

    // Generate new password hash for admin123
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`Setting password for admin user to: ${newPassword}`);
    console.log('');

    // Update admin password
    const result = await pool.query(
      'UPDATE public.tbl_user SET password = $1 WHERE username = $2 RETURNING username',
      [hashedPassword, 'admin']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log(`Username: ${result.rows[0].username}`);
      console.log(`New Password: ${newPassword}`);
      console.log('');
      
      // Verify the new password
      const verifyResult = await pool.query('SELECT password FROM public.tbl_user WHERE username = $1', ['admin']);
      const isValid = await bcrypt.compare(newPassword, verifyResult.rows[0].password);
      
      console.log('🔐 PASSWORD VERIFICATION:');
      console.log(`Password "${newPassword}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
      
    } else {
      console.log('❌ Failed to update admin password');
    }

    console.log('');
    console.log('🎯 LOGIN CREDENTIALS:');
    console.log('=====================');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Role: Admin (Full Access)');
    console.log('');
    console.log('🚀 Ready for testing!');

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
