const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function debugAdminLogin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 DEBUGGING ADMIN LOGIN ISSUE');
    console.log('================================');
    console.log('');

    // Check admin user details
    const adminResult = await pool.query(`
      SELECT 
        a.id, a.username, a.fullname, a.email, a.password,
        b.role, c.jabatan
      FROM public.tbl_user as a
      LEFT JOIN public.tbl_role as b ON a.role = b.id
      LEFT JOIN public.tbl_jabatan as c ON a.jabatan = c.id
      WHERE a.username = 'admin'
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found in database');
      return;
    }

    const admin = adminResult.rows[0];
    console.log('👤 ADMIN USER DETAILS:');
    console.log('======================');
    console.log(`ID: ${admin.id}`);
    console.log(`Username: ${admin.username}`);
    console.log(`Full Name: ${admin.fullname}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role || 'Not assigned'}`);
    console.log(`Jabatan: ${admin.jabatan || 'Not assigned'}`);
    console.log(`Password Hash: ${admin.password ? 'Present' : 'Missing'}`);
    console.log('');

    // Test password verification
    console.log('🔐 PASSWORD VERIFICATION TESTS:');
    console.log('===============================');
    
    const testPasswords = ['admin123', 'admin', 'password', 'test123'];
    
    for (const testPassword of testPasswords) {
      try {
        const isValid = await bcrypt.compare(testPassword, admin.password);
        console.log(`Password "${testPassword}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
      } catch (error) {
        console.log(`Password "${testPassword}": ❌ Error - ${error.message}`);
      }
    }

    console.log('');
    console.log('🎭 ROLE ASSIGNMENT CHECK:');
    console.log('==========================');
    
    if (!admin.role) {
      console.log('❌ Admin user has no role assigned!');
      console.log('This is likely the cause of login issues.');
      console.log('');
      console.log('🔧 FIXING ROLE ASSIGNMENT...');
      
      // Assign Admin role (ID 1) to admin user
      await pool.query('UPDATE public.tbl_user SET role = 1 WHERE username = $1', ['admin']);
      console.log('✅ Admin role assigned successfully!');
    } else {
      console.log(`✅ Admin role is assigned: ${admin.role}`);
    }

    console.log('');
    console.log('🔐 PASSWORD RESET OPTIONS:');
    console.log('==========================');
    console.log('If password verification fails, you can reset it:');
    console.log('');
    
    // Generate new password hash
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`New password hash for "${newPassword}":`);
    console.log(hashedPassword);
    console.log('');
    console.log('To reset password, run this SQL:');
    console.log(`UPDATE public.tbl_user SET password = '${hashedPassword}' WHERE username = 'admin';`);

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugAdminLogin();
