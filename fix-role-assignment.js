const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debugRoleAssignment() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 DEBUGGING ROLE ASSIGNMENT');
    console.log('============================');
    console.log('');

    // Check all users and their roles
    const result = await pool.query(`
      SELECT 
        a.id, a.username, a.fullname, a.email,
        b.role, c.jabatan
      FROM public.tbl_user as a
      LEFT JOIN public.tbl_role as b ON a.role = b.id
      LEFT JOIN public.tbl_jabatan as c ON a.jabatan = c.id
      ORDER BY a.id ASC
    `);

    console.log('👥 ALL USERS AND ROLES:');
    console.log('=======================');
    
    if (result.rows.length === 0) {
      console.log('No users found in the database.');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Full Name: ${user.fullname}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role || '❌ NOT ASSIGNED'}`);
        console.log(`   Jabatan: ${user.jabatan || '❌ NOT ASSIGNED'}`);
        console.log('');
      });
    }

    // Check roles table
    const rolesResult = await pool.query('SELECT id, role FROM public.tbl_role ORDER BY id ASC');
    console.log('🎭 AVAILABLE ROLES:');
    console.log('===================');
    rolesResult.rows.forEach(role => {
      console.log(`${role.id}. ${role.role}`);
    });

    console.log('');
    console.log('🔧 FIXING ROLE ASSIGNMENTS:');
    console.log('===========================');
    
    // Fix admin role
    const adminUpdate = await pool.query('UPDATE public.tbl_user SET role = 1 WHERE username = $1', ['admin']);
    console.log(`✅ Admin role assigned: ${adminUpdate.rowCount} rows affected`);
    
    // Fix user role
    const userUpdate = await pool.query('UPDATE public.tbl_user SET role = 2 WHERE username = $1', ['testing.itu']);
    console.log(`✅ User role assigned: ${userUpdate.rowCount} rows affected`);

    console.log('');
    console.log('🎯 FINAL LOGIN CREDENTIALS:');
    console.log('===========================');
    console.log('');
    console.log('🔴 ADMIN USER:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: Admin (Full Access)');
    console.log('   Expected: Administrator menu visible');
    console.log('');
    console.log('🟢 USER ACCOUNT:');
    console.log('   Username: testing.itu');
    console.log('   Password: testing123');
    console.log('   Role: User (Read-Only)');
    console.log('   Expected: Administrator menu hidden');
    console.log('');
    console.log('🚀 Ready for testing!');

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugRoleAssignment();
